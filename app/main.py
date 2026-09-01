from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel, Field
import os
import json
import httpx
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse
import logging
from app.gemini_utils import call_gemini_api_sync

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv(override=True)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
logger.info(f"Loaded key prefix: {GEMINI_API_KEY[:8]}")
if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY not found in environment variables")

MODEL_NAME = "gemini-3.6-flash"
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

class ReviewResponse(BaseModel):
    review: str
    success: bool
    token_count: int | None = None

class FixRequest(BaseModel):
    code: str
    issue_message: str
    line: int | None = None
    original_snippet: str | None = None

class FixResponse(BaseModel):
    fixed_code: str

# --- Structured JSON Prompt ---

STRUCTURED_PROMPT_TEMPLATE = """You are a senior software engineer and a patient, encouraging mentor for junior developers. Your job is to help someone LEARN from this code review, not just to catalog problems. You take real engineering issues seriously, but you explain them the way a great mentor would in a 1:1 — clearly, kindly, and without jargon-dropping.

Analyze the provided code and respond with ONLY a valid JSON object (no markdown fences, no extra text) matching this exact schema:

{{
  "summary": "A brief 1-2 sentence overall assessment, written encouragingly even when issues exist (e.g. acknowledge what's working before flagging what needs work).",
  "categories": {{
    "bugs": [
      {{
        "line": <line_number_or_null>,
        "severity": "error" | "warning" | "info",
        "title": "Short, plain-English title (max 8 words)",
        "description": "Max 2 short sentences. Explain WHAT the issue is and WHY it matters in plain English first. If you use a technical term (e.g. 'race condition', 'null pointer'), immediately follow it with a short plain-English clarification in parentheses. End by pointing to the fix below if one exists in 'suggestions'."
      }}
    ],
    "security": [
      {{
        "line": <line_number_or_null>,
        "severity": "error" | "warning" | "info",
        "title": "Short, plain-English title (max 8 words)",
        "description": "Max 2 short sentences. Explain the real-world risk in concrete terms (what could go wrong, who could be affected) before naming the technical vulnerability type. Same jargon rule as above."
      }}
    ],
    "performance": [
      {{
        "line": <line_number_or_null>,
        "severity": "error" | "warning" | "info",
        "title": "Short, plain-English title (max 8 words)",
        "description": "Max 2 short sentences. Describe the practical impact (e.g. 'this gets slow with large lists') before any technical term like Big O notation. If you cite complexity (e.g. O(n^2)), explain briefly what that means in practice."
      }}
    ],
    "best_practices": [
      {{
        "line": <line_number_or_null>,
        "severity": "warning" | "info",
        "title": "Short, plain-English title (max 8 words)",
        "description": "Max 2 short sentences. Frame as a growth opportunity, not a rule violation — explain the benefit of the practice, not just its name."
      }}
    ],
    "positives": [
      {{
        "title": "Short, specific title (max 8 words)",
        "description": "Max 2 short sentences. Be SPECIFIC to this code, not generic praise. Name the exact thing done well and briefly why it's good practice."
      }}
    ]
  }},
  "suggestions": [
    {{
      "line": <line_number>,
      "severity": "error" | "warning" | "info",
      "message": "Max 1-2 short sentences: what to change and why, in plain English.",
      "original": "The exact original line(s) of code.",
      "replacement": "The corrected/improved replacement code, with a brief inline comment explaining the key change if it isn't obvious."
    }}
  ]
}}

WRITING RULES (apply to every text field above):
- Keep every description/message SHORT: 2 sentences maximum, no long paragraphs. Junior developers are scanning, not reading essays.
- Explain concepts in plain English FIRST, technical term SECOND. Example pattern: "This will crash if the list is empty (a bug called a 'ZeroDivisionError') because..." — not the reverse.
- Never use dismissive or blunt language ("this is wrong", "bad practice", "sloppy"). Use supportive framing: "here's a chance to make this more robust", "a small tweak here will prevent...".
- Every issue in "bugs", "security", and "performance" that has a concrete fix MUST have a matching entry in "suggestions" with the same line number, so the UI can link them.
- In "suggestions", the replacement code should be a complete, correct, drop-in fix — not a partial hint.
- Always include at least one "positives" entry if the code has any genuine strength, however small — this matters for a junior developer's confidence and learning.

OUTPUT RULES:
- Every array can be empty if there are no issues in that category.
- "line" should be a 1-based line number referencing the submitted code, or null if not applicable.
- Respond ONLY with the JSON. No markdown, no explanation outside the JSON, no text before or after the JSON object.

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
        review_text, data = call_gemini_api_sync(
            endpoint=GEMINI_ENDPOINT,
            api_key=GEMINI_API_KEY,
            payload=payload,
            logger=logger,
            api_name="Review API",
            empty_candidates_msg="No review generated. API returned empty results.",
            empty_parts_msg="No review content found in API response."
        )

        total_tokens = data.get("usageMetadata", {}).get("totalTokenCount")

        logger.info(f"Review completed successfully. Tokens used: {total_tokens}")
        return ReviewResponse(review=review_text, success=True, token_count=total_tokens)

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
        max_retries = 3
        for attempt in range(max_retries):
            accumulated = ""
            try:
                logger.info(f"[SSE] Streaming review for {len(request.code)} chars (Attempt {attempt + 1})")
                async with httpx.AsyncClient(timeout=httpx.Timeout(90.0)) as client:
                    async with client.stream(
                        "POST",
                        f"{GEMINI_STREAM_ENDPOINT}?key={GEMINI_API_KEY}&alt=sse",
                        json=payload,
                        headers={"Content-Type": "application/json"},
                    ) as response:
                        if response.status_code == 429:
                            if attempt < max_retries - 1:
                                wait_time = (2 ** attempt) * 2  # 2s, 4s
                                logger.warning(f"[SSE] Rate limit hit (429). Retrying in {wait_time}s...")
                                import asyncio
                                await asyncio.sleep(wait_time)
                                continue
                            else:
                                error_body = await response.aread()
                                logger.error(f"[SSE] API Error {response.status_code}: {error_body.decode()}")
                                yield {"event": "error", "data": json.dumps({"detail": "Rate limit exceeded (429). Please wait a moment and try again."})}
                                return

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
                return # Successfully processed stream, break loop

            except httpx.TimeoutException:
                logger.error("[SSE] Request timeout")
                if attempt == max_retries - 1:
                    yield {"event": "error", "data": json.dumps({"detail": "Request timed out"})}
                    return
                import asyncio
                await asyncio.sleep(2)
            except Exception as e:
                logger.error(f"[SSE] Unexpected error: {str(e)}")
                yield {"event": "error", "data": json.dumps({"detail": str(e)})}
                return

    return EventSourceResponse(event_generator())


@app.post("/fix/", response_model=FixResponse)
def fix_code(request: FixRequest):
    """Dynamically generate a fix for a specific issue using Gemini."""
    prompt = f"""You are an expert software engineer. Fix the following code to resolve the specified issue.
    
Original Code:
```
{request.code}
```

Issue to fix: {request.issue_message}
Line: {request.line}
Original Snippet: {request.original_snippet}

Please provide the FULL, complete, and corrected code for the entire file that resolves this issue.
Return ONLY the raw source code. Do NOT wrap it in markdown code blocks (no ```python ... ```). Do not include any explanations. Do not include any other text.
"""

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 8192,
        },
    }

    headers = {"Content-Type": "application/json"}

    try:
        fixed_text, _ = call_gemini_api_sync(
            endpoint=GEMINI_ENDPOINT,
            api_key=GEMINI_API_KEY,
            payload=payload,
            logger=logger,
            api_name="Fix API",
            empty_candidates_msg="No code generated.",
            empty_parts_msg="No code content found."
        )

        # Optional: strip potential markdown code blocks if the model ignores the instruction
        if fixed_text.startswith("```"):
            lines = fixed_text.splitlines()
            if lines:
                lines = lines[1:]
                if lines and lines[-1].startswith("```"):
                    lines = lines[:-1]
                fixed_text = "\n".join(lines)

        return FixResponse(fixed_code=fixed_text)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Fix error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
