import secrets
import uuid
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import get_current_user
from app.models import Trip, TripActivity, TripCopy, TripSection, User
from app.schemas.trip import PublishResponse, TripCreate, TripResponse, TripUpdate
from app.services.trip_status import derive_status


router = APIRouter()

COVER_DIR = Path("uploads/covers")


def _serialize(t: Trip) -> TripResponse:
    return TripResponse(
        id=t.id,
        user_id=t.user_id,
        name=t.name,
        description=t.description,
        start_date=t.start_date,
        end_date=t.end_date,
        cover_photo_url=t.cover_photo_url,
        total_budget=t.total_budget,
        status=derive_status(t.start_date, t.end_date),
        is_public=t.is_public,
        public_slug=t.public_slug,
        section_count=len(t.sections),
        created_at=t.created_at,
    )


@router.get("", response_model=List[TripResponse])
def list_trips(
    status: Optional[str] = Query(default=None, description="ongoing|upcoming|completed|draft"),
    search: Optional[str] = None,
    sort: str = Query(default="-created_at"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Trip).filter(Trip.user_id == user.id)
    if search:
        like = f"%{search.lower()}%"
        q = q.filter(
            or_(func.lower(Trip.name).like(like), func.lower(Trip.description).like(like))
        )
    sort_col = sort.lstrip("-")
    direction = "desc" if sort.startswith("-") else "asc"
    if sort_col not in ("created_at", "start_date", "name"):
        sort_col = "created_at"
    col = getattr(Trip, sort_col)
    q = q.order_by(col.desc() if direction == "desc" else col.asc())
    out = [_serialize(t) for t in q.all()]
    if status:
        out = [t for t in out if t.status == status]
    return out


@router.post("", response_model=TripResponse, status_code=status.HTTP_201_CREATED)
def create_trip(payload: TripCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if payload.start_date > payload.end_date:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "start_date must be on or before end_date")
    trip = Trip(user_id=user.id, **payload.model_dump())
    db.add(trip)
    db.commit()
    db.refresh(trip)
    return _serialize(trip)


@router.get("/templates", response_model=List[TripResponse])
def list_templates(db: Session = Depends(get_db)):
    return [_serialize(t) for t in db.query(Trip).filter(Trip.is_template.is_(True)).all()]


@router.get("/public/{slug}", response_model=TripResponse)
def get_public(slug: str, db: Session = Depends(get_db)):
    trip = db.query(Trip).filter(Trip.public_slug == slug, Trip.is_public.is_(True)).first()
    if not trip:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Public trip not found")
    return _serialize(trip)


@router.get("/public/{slug}/full")
def get_public_full(slug: str, db: Session = Depends(get_db)):
    trip = db.query(Trip).filter(Trip.public_slug == slug, Trip.is_public.is_(True)).first()
    if not trip:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Public trip not found")
    return {
        "trip": _serialize(trip),
        "sections": [
            {
                "id": s.id,
                "title": s.title,
                "description": s.description,
                "city_id": s.city_id,
                "city_name": s.city.name if s.city else None,
                "start_date": s.start_date,
                "end_date": s.end_date,
                "section_budget": s.section_budget,
                "order_index": s.order_index,
                "activities": [
                    {
                        "id": a.id,
                        "name": a.name,
                        "category": a.category,
                        "cost": a.cost,
                        "duration_min": a.duration_min,
                        "order_index": a.order_index,
                    }
                    for a in s.activities
                ],
            }
            for s in trip.sections
        ],
    }


@router.get("/{trip_id}", response_model=TripResponse)
def get_trip(trip_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    trip = db.query(Trip).filter(Trip.id == trip_id, Trip.user_id == user.id).first()
    if not trip:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Trip not found")
    return _serialize(trip)


@router.put("/{trip_id}", response_model=TripResponse)
def update_trip(
    trip_id: str,
    payload: TripUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    trip = db.query(Trip).filter(Trip.id == trip_id, Trip.user_id == user.id).first()
    if not trip:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Trip not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(trip, k, v)
    db.commit()
    db.refresh(trip)
    return _serialize(trip)


@router.delete("/{trip_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_trip(trip_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    trip = db.query(Trip).filter(Trip.id == trip_id, Trip.user_id == user.id).first()
    if not trip:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Trip not found")
    db.delete(trip)
    db.commit()


@router.post("/{trip_id}/cover", response_model=TripResponse)
async def upload_cover(
    trip_id: str,
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    trip = db.query(Trip).filter(Trip.id == trip_id, Trip.user_id == user.id).first()
    if not trip:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Trip not found")
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Must be an image")
    COVER_DIR.mkdir(parents=True, exist_ok=True)
    ext = Path(file.filename or "img.jpg").suffix or ".jpg"
    name = f"{trip_id}_{uuid.uuid4().hex}{ext}"
    (COVER_DIR / name).write_bytes(await file.read())
    trip.cover_photo_url = f"/static/covers/{name}"
    db.commit()
    db.refresh(trip)
    return _serialize(trip)


@router.post("/{trip_id}/publish", response_model=PublishResponse)
def publish(trip_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    trip = db.query(Trip).filter(Trip.id == trip_id, Trip.user_id == user.id).first()
    if not trip:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Trip not found")
    if not trip.public_slug:
        trip.public_slug = secrets.token_urlsafe(8)
    trip.is_public = True
    db.commit()
    return PublishResponse(
        public_slug=trip.public_slug,
        public_url=f"/trips/public/{trip.public_slug}",
    )


@router.post("/{trip_id}/copy", response_model=TripResponse, status_code=status.HTTP_201_CREATED)
def copy_trip(trip_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    src = db.query(Trip).filter(Trip.id == trip_id).first()
    if not src or (not src.is_public and src.user_id != user.id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Trip not found")
    new = Trip(
        user_id=user.id,
        name=f"{src.name} (copy)",
        description=src.description,
        start_date=src.start_date,
        end_date=src.end_date,
        cover_photo_url=src.cover_photo_url,
        total_budget=src.total_budget,
    )
    db.add(new)
    db.flush()
    for s in src.sections:
        ns = TripSection(
            trip_id=new.id,
            city_id=s.city_id,
            title=s.title,
            description=s.description,
            start_date=s.start_date,
            end_date=s.end_date,
            section_budget=s.section_budget,
            order_index=s.order_index,
        )
        db.add(ns)
        db.flush()
        for a in s.activities:
            db.add(
                TripActivity(
                    section_id=ns.id,
                    template_id=a.template_id,
                    name=a.name,
                    category=a.category,
                    cost=a.cost,
                    duration_min=a.duration_min,
                    scheduled_at=a.scheduled_at,
                    notes=a.notes,
                    order_index=a.order_index,
                )
            )
    db.add(TripCopy(original_trip_id=src.id, copied_trip_id=new.id, copied_by_user_id=user.id))
    db.commit()
    db.refresh(new)
    return _serialize(new)
