"""Gemini concept renders.

The image is illustrative only. It is generated from text that describes the
already-decided dimensions; the model never supplies a dimension and nothing it
returns is fed back into the calculation.
"""

from __future__ import annotations

import base64
import json
import logging
import urllib.error
import urllib.request

from app.core.config import settings

logger = logging.getLogger(__name__)

_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"


def _prompt(system: str, tank_label: str | None, structure_type: str | None) -> str:
    tank = tank_label or "a storage tank"
    if structure_type:
        structure = (
            f"Include a cutaway of the underground recharge {structure_type} with layers of "
            "sand, gravel, and boulders, connected by an overflow pipe."
        )
    else:
        structure = "Do not show any underground recharge structure."

    return (
        "A photorealistic architectural illustration of a residential rooftop rainwater "
        "harvesting system in India. A flat concrete roof with gutters and downpipes feeds a "
        f"first-flush diverter, a sand-and-gravel filter, and {tank}. {structure} "
        "Show clean pipework, a small paved compound, and daylight. "
        "No people, no text, no labels, no watermarks, no diagrams. "
        f"The overall system type is {system.replace('_', ' ')}."
    )


def generate_concept(
    *,
    system: str,
    tank_label: str | None,
    structure_type: str | None,
    notes: list[str] | None = None,
) -> dict:
    if not settings.gemini_api_key:
        return {
            "configured": False,
            "message": (
                "AI concept images are disabled. Set GEMINI_API_KEY on the backend to enable "
                "them. The parametric 3D view above is generated from the stored dimensions and "
                "does not need a key."
            ),
            "image_data_url": None,
            "narrative": None,
            "model": None,
        }

    body = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": _prompt(system, tank_label, structure_type)}],
            }
        ],
        "generationConfig": {"responseModalities": ["TEXT", "IMAGE"]},
    }

    request = urllib.request.Request(
        _ENDPOINT.format(model=settings.gemini_image_model),
        data=json.dumps(body).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "x-goog-api-key": settings.gemini_api_key,
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=settings.gemini_timeout_seconds) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="ignore")[:400]
        logger.warning("Gemini HTTP error %s: %s", error.code, detail)
        return {
            "configured": True,
            "message": f"Gemini returned HTTP {error.code}. Check the API key and model name.",
            "image_data_url": None,
            "narrative": None,
            "model": settings.gemini_image_model,
        }
    except Exception as error:  # noqa: BLE001 - surfaced to the user, not swallowed
        logger.warning("Gemini request failed: %s", error)
        return {
            "configured": True,
            "message": "Could not reach Gemini. Try again in a moment.",
            "image_data_url": None,
            "narrative": None,
            "model": settings.gemini_image_model,
        }

    candidates = payload.get("candidates") or []
    parts = (candidates[0].get("content", {}).get("parts", []) if candidates else []) or []

    image_data_url: str | None = None
    texts: list[str] = []

    for part in parts:
        inline = part.get("inlineData") or part.get("inline_data")
        if inline and str(inline.get("mimeType", "")).startswith("image/"):
            encoded = inline.get("data")
            if encoded:
                image_data_url = f"data:{inline['mimeType']};base64,{encoded}"
        elif part.get("text"):
            texts.append(str(part["text"]).strip())

    if image_data_url is None:
        return {
            "configured": True,
            "message": (
                "Gemini responded without an image. The model may have refused the prompt or "
                "returned text only."
            ),
            "image_data_url": None,
            "narrative": " ".join(texts) or None,
            "model": settings.gemini_image_model,
        }

    return {
        "configured": True,
        "message": "Concept image generated. Illustrative only, not to scale.",
        "image_data_url": image_data_url,
        "narrative": " ".join(texts) or None,
        "model": settings.gemini_image_model,
    }
