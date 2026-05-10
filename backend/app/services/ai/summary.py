"""
backend/app/services/ai/summary.py
------------------------------------
Generates a short 2-sentence public summary of a trip.
Used in the public share view.

Public API
----------
    summarize_trip(trip_id: str, db: Session) -> str

Note: Uses backend models — TripSection (not ItinerarySection),
      TripActivity (not Activity), UUID str PKs.
"""
from __future__ import annotations

import logging
from textwrap import dedent

from sqlalchemy.orm import Session

from app.services.ai.client import llm_call

logger = logging.getLogger(__name__)


def summarize_trip(trip_id: str, db: Session) -> str:
    """
    Fetch the trip + sections + activities from DB,
    then ask the LLM for a two-sentence public summary.
    """
    from app.models.trip import Trip  # noqa: PLC0415

    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if trip is None:
        raise ValueError(f"Trip {trip_id} not found")

    # Build a compact representation of the itinerary for the prompt
    sections_text = ""
    try:
        from app.models.section import TripSection  # noqa: PLC0415
        from app.models.activity import TripActivity  # noqa: PLC0415

        sections = (
            db.query(TripSection)
            .filter(TripSection.trip_id == trip_id)
            .order_by(TripSection.order_index)
            .all()
        )
        for sec in sections:
            activities = (
                db.query(TripActivity)
                .filter(TripActivity.section_id == sec.id)
                .order_by(TripActivity.order_index)
                .all()
            )
            act_names = ", ".join(a.name for a in activities[:4])
            sections_text += f"- {sec.title}: {act_names}\n"
    except Exception as exc:
        logger.warning("Could not load sections/activities for summary: %s", exc)
        sections_text = "(itinerary details unavailable)"

    prompt = dedent(f"""
        You are writing a short, enthusiastic public trip summary for a travel app.

        Trip: {trip.name}
        Destination: {getattr(trip, 'destination', 'Unknown')}
        Dates: {trip.start_date} to {trip.end_date}
        Highlights:
        {sections_text}

        Write exactly 2 sentences (max 60 words total) that capture the essence of
        this trip in an engaging, shareable way. No headers, no bullet points — plain
        prose only.
    """).strip()

    summary = llm_call(prompt, json_mode=False).strip()
    logger.info("Generated summary for trip %s (%d chars)", trip_id, len(summary))
    return summary
