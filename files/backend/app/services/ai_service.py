import re
import json
import time
import logging
from typing import Optional
from sqlalchemy.orm import Session
import httpx

from app.core.config import settings
from app.schemas.ai_schemas import ListingAssistOut
from app.middleware.error_handler import AIServiceError
from app.models.ai import AIInteraction

logger = logging.getLogger(__name__)

ALLOWED_CATEGORY_SLUGS = [
    "electronics",
    "laptops-computers",
    "mobiles-tablets",
    "audio-gear",
    "gaming-consoles",
    "cameras-optics",
    "appliances"
]

ALLOWED_CONDITIONS = ["like_new", "good", "fair", "poor", "new"]


def _log_interaction(
    db: Optional[Session],
    user_id: Optional[str],
    feature: str,
    input_data: dict,
    output_data: Optional[dict],
    status: str,
    latency_ms: int
):
    if not db:
        return
    try:
        interaction = AIInteraction(
            user_id=user_id,
            feature=feature,
            input_summary=input_data,
            output_summary=output_data,
            status=status,
            latency_ms=latency_ms
        )
        db.add(interaction)
        db.commit()
    except Exception as e:
        logger.warning(f"Failed to log AI interaction: {e}")
        try:
            db.rollback()
        except Exception:
            pass


def _mock_listing_assist(description: str) -> ListingAssistOut:
    """Fallback / Mock AI extractor for testing and offline development."""
    lower = description.lower()

    # Brand heuristics
    detected_brand = None
    brand_map = {
        "apple": "Apple",
        "iphone": "Apple",
        "macbook": "Apple",
        "ipad": "Apple",
        "airpods": "Apple",
        "samsung": "Samsung",
        "galaxy": "Samsung",
        "sony": "Sony",
        "playstation": "Sony",
        "ps4": "Sony",
        "ps5": "Sony",
        "dell": "Dell",
        "xps": "Dell",
        "lenovo": "Lenovo",
        "thinkpad": "Lenovo",
        "hp": "HP",
        "asus": "Asus",
        "acer": "Acer",
        "microsoft": "Microsoft",
        "surface": "Microsoft",
        "xbox": "Microsoft",
        "nintendo": "Nintendo",
        "canon": "Canon",
        "nikon": "Nikon",
        "fujifilm": "Fujifilm",
        "bose": "Bose",
        "jbl": "JBL",
        "logitech": "Logitech",
        "oneplus": "OnePlus",
        "xiaomi": "Xiaomi",
        "lg": "LG"
    }
    for key, name in brand_map.items():
        if re.search(r'\b' + re.escape(key) + r'\b', lower):
            detected_brand = name
            break

    # Category heuristics
    if any(w in lower for w in ["phone", "iphone", "pixel", "galaxy s", "mobile", "ipad", "tablet"]):
        cat = "mobiles-tablets"
    elif any(w in lower for w in ["laptop", "macbook", "notebook", "thinkpad", "desktop", "pc", "chromebook", "xps", "zenbook", "inspiron", "latitude"]):
        cat = "laptops-computers"
    elif any(w in lower for w in ["headphone", "earphone", "airpods", "earbuds", "speaker", "soundbar", "mic"]):
        cat = "audio-gear"
    elif any(w in lower for w in ["playstation", "ps4", "ps5", "xbox", "nintendo", "switch", "controller", "console"]):
        cat = "gaming-consoles"
    elif any(w in lower for w in ["camera", "dslr", "lens", "mirrorless", "gopro"]):
        cat = "cameras-optics"
    elif any(w in lower for w in ["fridge", "microwave", "washing machine", "vacuum", "air conditioner", "ac", "purifier"]):
        cat = "appliances"
    else:
        cat = "electronics"

    # Condition heuristics
    if any(w in lower for w in ["sealed", "brand new", "unopened", "never used"]):
        condition = "new"
    elif any(w in lower for w in ["like new", "flawless", "mint", "barely used", "pristine"]):
        condition = "like_new"
    elif any(w in lower for w in ["poor", "heavy wear", "cracked", "broken", "dent"]):
        condition = "poor"
    elif any(w in lower for w in ["fair", "scuff", "wear", "scratch", "scratched"]):
        condition = "fair"
    else:
        condition = "good"

    # Title extraction
    # Clean up phrases like "Selling ", "I have a ", etc.
    cleaned_first_line = re.sub(r'^(selling|for sale|up for sale|have a|i am selling)\s+', '', description.strip(), flags=re.IGNORECASE)
    first_part = cleaned_first_line.split('.')[0].split(',')[0].strip()
    if len(first_part) > 60:
        first_part = first_part[:57] + "..."
    if detected_brand and detected_brand.lower() not in first_part.lower():
        title = f"{detected_brand} {first_part}".strip()
    else:
        title = first_part.title() if first_part.islower() else first_part

    # Clean description
    formatted_desc = description.strip()
    if not formatted_desc.endswith('.'):
        formatted_desc += '.'

    return ListingAssistOut(
        title=title,
        category_slug=cat,
        brand=detected_brand,
        model=first_part if first_part != title else None,
        condition=condition,
        description=formatted_desc
    )


def generate_listing_draft(
    db: Optional[Session],
    description: str,
    user_id: Optional[str] = None
) -> ListingAssistOut:
    """
    Extracts structured product data from seller free-text description.
    Supports Google Gemini API or Mock provider based on configuration.
    """
    start_time = time.time()
    input_summary = {"description_length": len(description), "preview": description[:100]}

    # Check if mock mode is requested or configured
    is_mock = (
        settings.AI_PROVIDER.lower() == "mock" or
        not settings.AI_API_KEY or
        settings.AI_API_KEY.lower().startswith("mock")
    )

    if is_mock:
        try:
            result = _mock_listing_assist(description)
            latency_ms = int((time.time() - start_time) * 1000)
            _log_interaction(db, user_id, "listing_assist", input_summary, result.model_dump(), "success", latency_ms)
            return result
        except Exception as e:
            latency_ms = int((time.time() - start_time) * 1000)
            _log_interaction(db, user_id, "listing_assist", input_summary, None, "failed", latency_ms)
            raise AIServiceError(code="AI_UNAVAILABLE", message="AI assistance is currently unavailable.")

    # External Gemini API call
    prompt = f"""You are an expert second-hand marketplace listing assistant for Auction Hub.
A seller has provided the following rough description of an item they want to sell:
\"\"\"{description}\"\"\"

Extract and structure the product details into JSON with the following exact keys:
- "title": A concise, clear product title suitable for a marketplace listing (3-80 characters).
- "category_slug": Exactly one of the following allowed category slugs:
  ["electronics", "laptops-computers", "mobiles-tablets", "audio-gear", "gaming-consoles", "cameras-optics", "appliances"]
- "brand": The brand name (e.g. Apple, Samsung, Dell, Sony) or null if not identifiable.
- "model": The model name / model variant (e.g. iPhone 13 128GB, XPS 15 9500) or null if unknown.
- "condition": Exactly one of: ["like_new", "good", "fair", "poor", "new"]. Infer based on age, scuffs, defects, or wear described. Default to "good" if unspecified.
- "description": A cleaned-up, well-formatted listing description highlighting key specs, condition, and any included accessories or defects mentioned.

Respond ONLY with valid JSON. Do not include markdown code block quotes.
"""

    gemini_url = f"{settings.AI_API_BASE_URL.rstrip('/')}/models/gemini-1.5-flash:generateContent?key={settings.AI_API_KEY}"
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt}
                ]
            }
        ],
        "generationConfig": {
            "response_mime_type": "application/json",
            "temperature": 0.2
        }
    }

    try:
        with httpx.Client(timeout=settings.AI_TIMEOUT_SECONDS) as client:
            response = client.post(
                gemini_url,
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            response.raise_for_status()
            data = response.json()

        # Parse candidate output
        candidates = data.get("candidates", [])
        if not candidates:
            raise ValueError("No candidate in AI response")

        content_parts = candidates[0].get("content", {}).get("parts", [])
        if not content_parts or "text" not in content_parts[0]:
            raise ValueError("Empty content in AI response")

        raw_text = content_parts[0]["text"].strip()
        parsed_json = json.loads(raw_text)

        # Validate category slug and condition
        cat_slug = parsed_json.get("category_slug")
        if cat_slug not in ALLOWED_CATEGORY_SLUGS:
            cat_slug = "electronics"

        cond = parsed_json.get("condition")
        if cond not in ALLOWED_CONDITIONS:
            cond = "good"

        result = ListingAssistOut(
            title=str(parsed_json.get("title") or "Item for Sale"),
            category_slug=cat_slug,
            brand=parsed_json.get("brand"),
            model=parsed_json.get("model"),
            condition=cond,
            description=str(parsed_json.get("description") or description)
        )

        latency_ms = int((time.time() - start_time) * 1000)
        _log_interaction(db, user_id, "listing_assist", input_summary, result.model_dump(), "success", latency_ms)
        return result

    except httpx.TimeoutException:
        latency_ms = int((time.time() - start_time) * 1000)
        _log_interaction(db, user_id, "listing_assist", input_summary, None, "timeout", latency_ms)
        logger.warning("AI listing assist call timed out.")
        raise AIServiceError(code="AI_TIMEOUT", message="AI assistance timed out. Please fill the form manually.")

    except (httpx.HTTPStatusError, httpx.RequestError) as e:
        latency_ms = int((time.time() - start_time) * 1000)
        _log_interaction(db, user_id, "listing_assist", input_summary, None, "failed", latency_ms)
        logger.warning(f"AI listing assist external request failed: {e}")
        raise AIServiceError(code="AI_UNAVAILABLE", message="AI service is temporarily unavailable. Please fill manually.")

    except Exception as e:
        latency_ms = int((time.time() - start_time) * 1000)
        _log_interaction(db, user_id, "listing_assist", input_summary, None, "invalid_response", latency_ms)
        logger.warning(f"AI listing assist parsing error: {e}")
        raise AIServiceError(code="AI_UNAVAILABLE", message="AI assistance could not process response. Please fill manually.")
