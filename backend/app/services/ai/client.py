"""
backend/app/services/ai/client.py
---------------------------------
Unified LLM caller.
Primary  : Groq  (llama-3.3-70b-versatile) — fast, free tier
Fallback : Gemini (gemini-1.5-flash)       — kicks in if Groq fails

Usage
-----
    from app.services.ai.client import llm_call

    text   = llm_call("Tell me about Paris.")
    obj    = llm_call("Return JSON with key 'x'", json_mode=True)
"""
from __future__ import annotations

import logging

from app.core.config import settings

logger = logging.getLogger(__name__)

# ── Groq client ───────────────────────────────────────────────────────────────
try:
    from groq import Groq

    _groq = Groq(api_key=settings.GROQ_API_KEY) if settings.GROQ_API_KEY else None
    _GROQ_MODEL = "llama-3.3-70b-versatile"
except Exception as exc:  # pragma: no cover
    logger.warning("Groq client init failed: %s", exc)
    _groq = None

# ── Gemini client ─────────────────────────────────────────────────────────────
try:
    import google.generativeai as genai

    if settings.GEMINI_API_KEY:
        genai.configure(api_key=settings.GEMINI_API_KEY)
    # gemini-1.5-flash was deprecated on the v1beta API; gemini-2.0-flash is
    # the current free-tier successor with the same generateContent signature.
    _GEMINI_MODEL = "gemini-2.0-flash"
except Exception as exc:  # pragma: no cover
    logger.warning("Gemini client init failed: %s", exc)
    genai = None  # type: ignore


# ── Public API ────────────────────────────────────────────────────────────────

def llm_call(prompt: str, json_mode: bool = False) -> str:
    """
    Call Groq first; fall back to Gemini on any error.

    Parameters
    ----------
    prompt:    The user / system prompt text.
    json_mode: If True, Groq is asked for a JSON object response.
               Gemini fallback also receives a JSON instruction suffix.

    Returns
    -------
    The raw string response from whichever model answered.

    Raises
    ------
    RuntimeError if both providers fail.
    """
    # ── Try Groq ──────────────────────────────────────────────────────────────
    if _groq:
        try:
            kwargs: dict = {
                "model": _GROQ_MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.7,
                "max_tokens": 2000,
            }
            if json_mode:
                kwargs["response_format"] = {"type": "json_object"}

            resp = _groq.chat.completions.create(**kwargs)
            content = resp.choices[0].message.content
            logger.debug("Groq responded (%d chars)", len(content or ""))
            return content or ""
        except Exception as exc:
            logger.warning("Groq call failed, switching to Gemini: %s", exc)

    # ── Fallback: Gemini ──────────────────────────────────────────────────────
    if genai and settings.GEMINI_API_KEY:
        try:
            full_prompt = prompt
            if json_mode:
                full_prompt += (
                    "\n\nIMPORTANT: Return ONLY a valid JSON object. "
                    "No markdown fences, no explanation, pure JSON."
                )
            model = genai.GenerativeModel(_GEMINI_MODEL)
            result = model.generate_content(full_prompt)
            content = result.text
            logger.debug("Gemini responded (%d chars)", len(content or ""))
            return content or ""
        except Exception as exc:
            logger.error("Gemini call also failed: %s", exc)

    raise RuntimeError(
        "Both Groq and Gemini are unavailable. "
        "Check GROQ_API_KEY / GEMINI_API_KEY in your .env file."
    )
