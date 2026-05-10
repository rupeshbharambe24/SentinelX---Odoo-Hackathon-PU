"""
backend/app/services/ai/itinerary.py
--------------------------------------
Generates a structured multi-day travel itinerary using the LLM.

Public API
----------
    generate_itinerary(req: ItineraryRequest) -> ItineraryResponse
"""
from __future__ import annotations

import json
import logging
import time
from textwrap import dedent
from typing import Tuple

from app.schemas.ai import ItineraryRequest, ItineraryResponse
from app.services.ai.client import llm_call

logger = logging.getLogger(__name__)

_MAX_RETRIES = 2

# In-memory itinerary cache: key = (destination_lower, days, sorted_interests, budget_int)
# value = (expiry_unix_ts, ItineraryResponse). Process-local, fine for a single
# uvicorn worker. Caps demo cost during repeated calls with the same input.
_CACHE_TTL_SECONDS = 60 * 60  # 1 hour
_cache: dict[Tuple[str, int, Tuple[str, ...], int], Tuple[float, ItineraryResponse]] = {}


def _cache_key(req: ItineraryRequest) -> Tuple[str, int, Tuple[str, ...], int]:
    return (
        req.destination.strip().lower(),
        req.days,
        tuple(sorted(i.strip().lower() for i in req.interests)),
        int(req.budget_usd),
    )


def _build_prompt(req: ItineraryRequest) -> str:
    interests_str = ", ".join(req.interests) if req.interests else "general tourism"
    budget = req.budget_usd
    return dedent(f"""
        You are an expert travel planner creating highly personalised itineraries.

        Generate a {req.days}-day travel itinerary for {req.destination}.
        Traveller interests: {interests_str}.
        Total budget: approximately ${budget:.0f} USD for the entire trip.

        Guidelines:
        - Group consecutive days with a similar theme into one section (e.g., "Day 1-2: Arrival & Exploration").
        - Each section must have 3–6 activities.
        - Distribute the budget realistically across sections.
        - Activity costs should sum close to section budget.
        - Descriptions must be genuinely helpful (1–2 sentences, include practical tips).
        - Mix categories to keep the trip dynamic.

        Return STRICT JSON only — no markdown fences, no explanation, pure JSON:
        {{
          "sections": [
            {{
              "title": "Day 1-2: Arrival & City Centre",
              "start_day": 1,
              "end_day": 2,
              "budget": 300,
              "activities": [
                {{
                  "name": "Visit Eiffel Tower",
                  "category": "sightseeing",
                  "cost": 28,
                  "duration_min": 120,
                  "description": "Iconic Paris landmark — book summit tickets online at least 3 days ahead to avoid queues."
                }}
              ]
            }}
          ],
          "total_estimated_cost": {budget:.0f}
        }}

        Allowed category values: sightseeing | food | adventure | shopping | nightlife | relaxation | transport
    """).strip()


def generate_itinerary(req: ItineraryRequest) -> ItineraryResponse:
    """
    Call the LLM and parse the JSON response into an ItineraryResponse.
    Retries up to _MAX_RETRIES times on parse failure.

    Identical (destination, days, interests, budget) requests within the last
    hour are served from an in-memory cache.
    """
    key = _cache_key(req)
    now = time.time()
    hit = _cache.get(key)
    if hit and hit[0] > now:
        logger.info("Itinerary cache HIT for %s (%d days)", req.destination, req.days)
        return hit[1]

    prompt = _build_prompt(req)
    last_exc: Exception | None = None

    for attempt in range(1, _MAX_RETRIES + 2):  # 1, 2, 3 total tries
        try:
            raw = llm_call(prompt, json_mode=True)
            # Strip accidental markdown fences the fallback model might add
            raw = raw.strip()
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
                raw = raw.strip()

            data = json.loads(raw)
            result = ItineraryResponse(**data)
            logger.info(
                "Itinerary generated for %s (%d sections, attempt %d)",
                req.destination,
                len(result.sections),
                attempt,
            )
            _cache[key] = (now + _CACHE_TTL_SECONDS, result)
            return result

        except (json.JSONDecodeError, ValueError, KeyError) as exc:
            last_exc = exc
            logger.warning(
                "Attempt %d/%d failed to parse itinerary: %s",
                attempt,
                _MAX_RETRIES + 1,
                exc,
            )

    raise ValueError(
        f"Could not generate a valid itinerary after {_MAX_RETRIES + 1} attempts. "
        f"Last error: {last_exc}"
    )
