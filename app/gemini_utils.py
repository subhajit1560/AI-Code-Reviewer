import time
import requests as req_lib
from fastapi import HTTPException
import logging

def call_gemini_api_sync(
    endpoint: str,
    api_key: str,
    payload: dict,
    logger: logging.Logger,
    api_name: str = "API",
    empty_candidates_msg: str = "No content generated.",
    empty_parts_msg: str = "No content found in API response."
) -> tuple[str, dict]:
    """
    Synchronously call the Gemini API with rate-limit retries and response parsing.
    Returns a tuple of (extracted_text, raw_data_dict).
    """
    headers = {"Content-Type": "application/json"}
    max_retries = 3
    
    try:
        for attempt in range(max_retries):
            response = req_lib.post(
                endpoint, headers=headers, json=payload,
                params={"key": api_key}, timeout=60
            )

            if response.status_code == 429:
                if attempt < max_retries - 1:
                    wait_time = (2 ** attempt) * 2
                    logger.warning(f"{api_name}: Rate limit hit (429). Retrying in {wait_time}s...")
                    time.sleep(wait_time)
                    continue
                else:
                    raise HTTPException(status_code=429, detail="Rate limit exceeded. Please wait a moment and try again.")

            if response.status_code != 200:
                error_detail = response.json() if response.text else {"error": "Unknown error"}
                logger.error(f"API Error {response.status_code}: {error_detail}")
                raise HTTPException(status_code=response.status_code, detail=f"API error: {error_detail}")
            
            break

        data = response.json()
        candidates = data.get("candidates", [])
        if not candidates:
            raise HTTPException(status_code=500, detail=empty_candidates_msg)

        content = candidates[0].get("content", {})
        parts = content.get("parts", [])
        if not parts:
            raise HTTPException(status_code=500, detail=empty_parts_msg)

        text = parts[0].get("text", "")
        return text, data

    except req_lib.exceptions.Timeout:
        logger.error(f"{api_name}: Request timeout")
        raise HTTPException(status_code=504, detail="Request timed out. Try shorter code.")
    except req_lib.exceptions.RequestException as e:
        logger.error(f"{api_name} Request error: {str(e)}")
        raise HTTPException(status_code=503, detail=f"Service unavailable: {str(e)}")
