from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel, Field
import os
import json
import httpx
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse
import logging
import asyncio

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY not found in environment variables")

MODEL_NAME = "gemini-2.5-flash"
GEMINI_ENDPOINT = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL_NAME}:generateContent"
GEMINI_STREAM_ENDPOINT = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL_NAME}:streamGenerateContent"

app = FastAPI(title="AI Code Review Bot", version="2.0.0")

# CORS (allow local frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CodeRequest(BaseModel):
    code: str = Field(..., min_length=1, max_length=10000)
    language: str | None = None
    is_diff: bool | None = False

class ReviewResponse(BaseModel):
    review: str
    success: bool
    token_count: int | None = None

# --- Structured JSON Prompt ---

STRUCTURED_PROMPT_TEMPLATE = """You are a world-class senior software engineer performing a comprehensive code review.

Analyze the provided code and respond with ONLY a valid JSON object (no markdown fences, no extra text) matching this exact schema:

{{
  "summary": "A brief 1-2 sentence overall assessment of the code quality.",
  "categories": {{
    "bugs": [
      {{
        "line": <line_number_or_null>,
        "severity": "error" | "warning" | "info",
        "title": "Short title",
        "description": "Detailed explanation of the bug."
      }}
    ],
    "security": [
      {{
        "line": <line_number_or_null>,
        "severity": "error" | "warning" | "info",
        "title": "Short title",
        "description": "Detailed explanation of the security concern."
      }}
    ],
    "performance": [
      {{
        "line": <line_number_or_null>,
        "severity": "error" | "warning" | "info",
        "title": "Short title",
        "description": "Detailed explanation of the performance issue."
      }}
    ],
    "best_practices": [
      {{
        "line": <line_number_or_null>,
        "severity": "warning" | "info",
        "title": "Short title",
        "description": "Detailed explanation of the best practice recommendation."
      }}
    ],
    "positives": [
      {{
        "title": "Short title",
        "description": "What was done well."
      }}
    ]
  }},
  "suggestions": [
    {{
      "line": <line_number>,
      "severity": "error" | "warning" | "info",
      "message": "What should change and why.",
      "original": "The exact original line(s) of code.",
      "replacement": "The corrected/improved replacement code."
    }}
  ]
}}

RULES:
- Every array can be empty if there are no issues in that category.
- "line" should be a 1-based line number referencing the submitted code, or null if not applicable.
- "suggestions" contains actionable fixes with original and replacement code.
- Respond ONLY with the JSON. No markdown, no explanation outside the JSON.

CODE TO REVIEW:
{code}
"""


@app.get("/")
def read_root():
    return {"message": "AI Code Review Bot API", "model": MODEL_NAME}

@app.get("/health/")
def health_check():
    return {"status": "healthy", "model": MODEL_NAME}


@app.post("/review/", response_model=ReviewResponse)
def review_code(request: CodeRequest):
    """Review code and return structured JSON (non-streaming fallback)."""
    prompt = STRUCTURED_PROMPT_TEMPLATE.format(code=request.code)

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.4,
            "maxOutputTokens": 8192,
            "topP": 0.95,
            "topK": 40,
            "responseMimeType": "application/json",
        },
        "safetySettings": [
            {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
            {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
        ],
    }

    headers = {"Content-Type": "application/json"}

    try:
        logger.info(f"Sending review request for {len(request.code)} characters")
        import requests as req_lib
        response = req_lib.post(
            GEMINI_ENDPOINT, headers=headers, json=payload,
            params={"key": GEMINI_API_KEY}, timeout=60
        )

        if response.status_code != 200:
            error_detail = response.json() if response.text else {"error": "Unknown error"}
            logger.error(f"API Error {response.status_code}: {error_detail}")
            raise HTTPException(status_code=response.status_code, detail=f"API error: {error_detail}")

        data = response.json()
        candidates = data.get("candidates", [])
        if not candidates:
            raise HTTPException(status_code=500, detail="No review generated. API returned empty results.")

        content = candidates[0].get("content", {})
        parts = content.get("parts", [])
        if not parts:
            raise HTTPException(status_code=500, detail="No review content found in API response.")

        review_text = parts[0].get("text", "")
        total_tokens = data.get("usageMetadata", {}).get("totalTokenCount")

        logger.info(f"Review completed successfully. Tokens used: {total_tokens}")
        return ReviewResponse(review=review_text, success=True, token_count=total_tokens)

    except req_lib.exceptions.Timeout:
        logger.error("Request timeout")
        raise HTTPException(status_code=504, detail="Request timed out. Try shorter code.")
    except req_lib.exceptions.RequestException as e:
        logger.error(f"Request error: {str(e)}")
        raise HTTPException(status_code=503, detail=f"Service unavailable: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@app.post("/review/stream")
async def review_code_stream(request: CodeRequest, req: Request):
    """Stream the AI review via Server-Sent Events (SSE).

    Events emitted:
      - type="chunk"  : partial text as it arrives
      - type="done"   : final assembled JSON string
      - type="error"  : error message
    """
    prompt = STRUCTURED_PROMPT_TEMPLATE.format(code=request.code)

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.4,
            "maxOutputTokens": 8192,
            "topP": 0.95,
            "topK": 40,
            "responseMimeType": "application/json",
        },
        "safetySettings": [
            {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
            {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
        ],
    }

    async def event_generator():
        accumulated = ""
        try:
            logger.info(f"[SSE] Streaming review for {len(request.code)} chars")
            async with httpx.AsyncClient(timeout=httpx.Timeout(90.0)) as client:
                async with client.stream(
                    "POST",
                    f"{GEMINI_STREAM_ENDPOINT}?key={GEMINI_API_KEY}&alt=sse",
                    json=payload,
                    headers={"Content-Type": "application/json"},
                ) as response:
                    if response.status_code != 200:
                        error_body = await response.aread()
                        logger.error(f"[SSE] API Error {response.status_code}: {error_body.decode()}")
                        yield {"event": "error", "data": json.dumps({"detail": f"API error {response.status_code}"})}
                        return

                    async for line in response.aiter_lines():
                        # Check if client disconnected
                        if await req.is_disconnected():
                            logger.info("[SSE] Client disconnected")
                            return

                        if not line.startswith("data: "):
                            continue

                        raw = line[len("data: "):]
                        try:
                            chunk_data = json.loads(raw)
                        except json.JSONDecodeError:
                            continue

                        candidates = chunk_data.get("candidates", [])
                        if not candidates:
                            continue

                        parts = candidates[0].get("content", {}).get("parts", [])
                        for part in parts:
                            text = part.get("text", "")
                            if text:
                                accumulated += text
                                yield {
                                    "event": "chunk",
                                    "data": json.dumps({"text": text}),
                                }

            # Stream complete — send the full result
            logger.info(f"[SSE] Stream complete. Total length: {len(accumulated)}")
            yield {
                "event": "done",
                "data": json.dumps({"full_review": accumulated}),
            }

        except httpx.TimeoutException:
            logger.error("[SSE] Request timeout")
            yield {"event": "error", "data": json.dumps({"detail": "Request timed out"})}
        except Exception as e:
            logger.error(f"[SSE] Unexpected error: {str(e)}")
            yield {"event": "error", "data": json.dumps({"detail": str(e)})}

    return EventSourceResponse(event_generator())


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
