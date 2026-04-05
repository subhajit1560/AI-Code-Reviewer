from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
import os
import requests
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
import logging

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

app = FastAPI(title="AI Code Review Bot", version="1.0.0")

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

@app.get("/")
def read_root():
    return {"message": "AI Code Review Bot API", "model": MODEL_NAME}

@app.get("/health/")
def health_check():
    return {"status": "healthy", "model": MODEL_NAME}

@app.post("/review/", response_model=ReviewResponse)
def review_code(request: CodeRequest):
    """Review code or PR diff"""
    lang_context = f" (Language: {request.language})" if request.language else ""

    if request.is_diff:
        prompt = f"""You are a senior engineer reviewing a GitHub PR diff{lang_context}.

Review the changes and provide actionable feedback including:

1. Bugs & Issues
2. Security Concerns
3. Performance
4. Best Practices
5. Positive Aspects

Include **file names and line numbers** when possible.

PR Diff:
{request.code}
"""
    else:
        prompt = f"""
        You are a senior engineer reviewing code{lang_context}.

Analyze the code for:

1. Bugs & Issues
2. Security Concerns
3. Performance
4. Best Practices
5. Positive Aspects

Code:{request.code}
"""


    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.4, "maxOutputTokens": 4096, "topP": 0.95, "topK": 40},
        "safetySettings": [
            {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
            {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
        ],
    }

    headers = {"Content-Type": "application/json"}

    try:
        logger.info(f"Sending review request for {len(request.code)} characters")
        response = requests.post(GEMINI_ENDPOINT, headers=headers, json=payload, params={"key": GEMINI_API_KEY}, timeout=60)

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

    except requests.exceptions.Timeout:
        logger.error("Request timeout")
        raise HTTPException(status_code=504, detail="Request timed out. Try shorter code.")
    except requests.exceptions.RequestException as e:
        logger.error(f"Request error: {str(e)}")
        raise HTTPException(status_code=503, detail=f"Service unavailable: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
    #print("success")

