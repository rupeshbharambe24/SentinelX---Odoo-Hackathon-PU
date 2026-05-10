"""
backend/app/services/ai/packing.py
------------------------------------
Generates a categorised packing list for a trip.

Public API
----------
    generate_packing_list(trip_id: str, db: Session) -> List[PackingItemSchema]

Note: Uses backend models (Trip uses UUID str PK, Expense uses UUID str PK).
"""
from __future__ import annotations

import json
import logging
from textwrap import dedent
from typing import List

from sqlalchemy.orm import Session

from app.schemas.ai import PackingItemSchema
from app.services.ai.client import llm_call

logger = logging.getLogger(__name__)


def _build_prompt(
    destination: str,
    travel_dates: str,
    activity_categories: List[str],
    days: int,
) -> str:
    cats = ", ".join(sorted(set(activity_categories))) or "general tourism"
    return dedent(f"""
        You are a professional travel packer helping a traveller prepare for their trip.

        Trip details:
        - Destination  : {destination}
        - Travel dates : {travel_dates}
        - Duration     : {days} days
        - Activities   : {cats}

        Generate a comprehensive, practical packing list.
        Include items specific to the destination's climate and the planned activities.
        Do NOT include obvious universals like "passport" unless they are unusually important here.

        Return STRICT JSON array only — no markdown, no explanation:
        [
          {{
            "name": "Sunscreen SPF 50",
            "category": "toiletries"
          }}
        ]

        Categories: documents | clothing | electronics | toiletries | other
        Provide 15–25 items across all categories.
    """).strip()


def generate_packing_list(trip_id: str, db: Session) -> List[PackingItemSchema]:
    """
    Fetch the trip from DB, build a context-aware prompt,
    and return a parsed list of packing items.
    """
    # Late import to avoid circular deps at module load
    from app.models.trip import Trip  # noqa: PLC0415
    from app.models.expense import Expense  # noqa: PLC0415
    from app.models.section import TripSection  # noqa: PLC0415

    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if trip is None:
        raise ValueError(f"Trip {trip_id} not found")

    # Gather activity categories from existing expenses (best-effort)
    try:
        expenses = db.query(Expense).filter(Expense.trip_id == trip_id).all()
        activity_categories = list({e.category for e in expenses if e.category})
    except Exception:
        activity_categories = []

    # Calculate duration
    days = 1
    try:
        days = max(1, (trip.end_date - trip.start_date).days)
    except Exception:
        pass

    # Resolve destination from sections
    destination = trip.name
    try:
        sections = db.query(TripSection).filter(TripSection.trip_id == trip.id).order_by(TripSection.order_index).all()
        cities = []
        for sec in sections:
            if sec.city and sec.city.name: cities.append(sec.city.name)
            elif sec.title: cities.append(sec.title)
        if cities:
            destination = ", ".join(dict.fromkeys(cities))
    except Exception:
        pass

    travel_dates = f"{trip.start_date} – {trip.end_date}"
    prompt = _build_prompt(destination, travel_dates, activity_categories, days)

    raw = llm_call(prompt, json_mode=True)
    raw = raw.strip()

    # Strip markdown fences (Gemini fallback sometimes adds them)
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()

    # The LLM might return a dict with a key wrapping the array
    data = json.loads(raw)
    if isinstance(data, dict):
        # common: {"items": [...]} or {"packing_list": [...]}
        for key in ("items", "packing_list", "list", "packing"):
            if key in data and isinstance(data[key], list):
                data = data[key]
                break

    if not isinstance(data, list):
        raise ValueError("LLM did not return a JSON array for packing list.")

    items = [PackingItemSchema(**item) for item in data]
    logger.info("Generated %d packing items for trip %s", len(items), trip_id)
    return items
