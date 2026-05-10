"""
backend/app/routers/ai.py
--------------------------
FastAPI router for all AI/LLM endpoints.

Prefix : /ai  (set in main.py)
Tags   : ["ai"]

Adapted for backend:
  - Uses app.core.db.get_db  and  app.core.security.get_current_user
  - Trip.id / Expense.trip_id are UUID strings
  - Schemas: ItineraryRequest has budget_usd; PackingItemSchema has name + category
"""
from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.trip import Trip
from app.schemas.ai import ItineraryRequest, ItineraryResponse, PackingItemSchema, TripSummaryResponse
from app.services.ai.itinerary import generate_itinerary
from app.services.ai.packing import generate_packing_list
from app.services.ai.summary import summarize_trip

router = APIRouter()


# ── 1. Itinerary Generator ────────────────────────────────────────────────────

@router.post(
    "/generate-itinerary",
    response_model=ItineraryResponse,
    summary="Generate AI Itinerary",
    description=(
        "Given a destination, duration, interests, and budget, returns "
        "a fully structured multi-day itinerary. Uses Groq (fast) with "
        "Gemini fallback. Typical latency < 2 s."
    ),
)
def gen_itinerary(
    req: ItineraryRequest,
    _: User = Depends(get_current_user),
) -> ItineraryResponse:
    try:
        return generate_itinerary(req)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


# ── 2. Packing List ───────────────────────────────────────────────────────────

@router.post(
    "/generate-packing/{trip_id}",
    response_model=List[PackingItemSchema],
    summary="Generate Packing List",
    description=(
        "Generates a context-aware packing list for the given trip, "
        "taking into account destination, duration, and planned activity types."
    ),
)
def gen_packing(
    trip_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> List[PackingItemSchema]:
    # Ownership check — users can only generate packing lists for their own trips
    trip = db.query(Trip).filter(Trip.id == trip_id, Trip.user_id == user.id).first()
    if not trip:
        raise HTTPException(
            status_code=404,
            detail=f"Trip {trip_id} not found or not owned by current user.",
        )
    try:
        return generate_packing_list(trip_id, db)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


# ── 3. Trip Summary ───────────────────────────────────────────────────────────

@router.post(
    "/summarize/{trip_id}",
    response_model=TripSummaryResponse,
    summary="Summarise Trip",
    description=(
        "Returns a 2-sentence plain-text summary of the trip, "
        "suitable for the public share view. No auth required."
    ),
)
def summarize(
    trip_id: str,
    db: Session = Depends(get_db),
) -> TripSummaryResponse:
    try:
        return TripSummaryResponse(summary=summarize_trip(trip_id, db))
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
