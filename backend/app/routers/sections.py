from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import get_current_user
from app.models import City, Trip, TripSection, User
from app.schemas.activity import ActivityResponse
from app.schemas.section import SectionCreate, SectionReorder, SectionResponse, SectionUpdate


router = APIRouter()


def _serialize(s: TripSection) -> SectionResponse:
    return SectionResponse(
        id=s.id,
        trip_id=s.trip_id,
        city_id=s.city_id,
        city_name=s.city.name if s.city else None,
        title=s.title,
        description=s.description,
        start_date=s.start_date,
        end_date=s.end_date,
        section_budget=s.section_budget,
        order_index=s.order_index,
        activities=[ActivityResponse.model_validate(a) for a in s.activities],
    )


def _own_trip(trip_id: str, user: User, db: Session) -> Trip:
    trip = db.query(Trip).filter(Trip.id == trip_id, Trip.user_id == user.id).first()
    if not trip:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Trip not found")
    return trip


@router.post("", response_model=SectionResponse, status_code=status.HTTP_201_CREATED)
def create_section(
    payload: SectionCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _own_trip(payload.trip_id, user, db)
    if payload.city_id and not db.query(City).filter(City.id == payload.city_id).first():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "city_id not found")
    next_order = db.query(TripSection).filter_by(trip_id=payload.trip_id).count()
    section = TripSection(**payload.model_dump(), order_index=next_order)
    db.add(section)
    db.commit()
    db.refresh(section)
    return _serialize(section)


@router.put("/{section_id}", response_model=SectionResponse)
def update_section(
    section_id: str,
    payload: SectionUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    section = db.query(TripSection).filter(TripSection.id == section_id).first()
    if not section:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Section not found")
    _own_trip(section.trip_id, user, db)
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(section, k, v)
    db.commit()
    db.refresh(section)
    return _serialize(section)


@router.delete("/{section_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_section(
    section_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    section = db.query(TripSection).filter(TripSection.id == section_id).first()
    if not section:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Section not found")
    _own_trip(section.trip_id, user, db)
    db.delete(section)
    db.commit()


@router.post("/reorder")
def reorder(
    payload: SectionReorder,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _own_trip(payload.trip_id, user, db)
    rows = db.query(TripSection).filter(TripSection.trip_id == payload.trip_id).all()
    by_id = {s.id: s for s in rows}
    if set(payload.section_ids) != set(by_id.keys()):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "section_ids must be exactly the sections of this trip",
        )
    for idx, sid in enumerate(payload.section_ids):
        by_id[sid].order_index = idx
    db.commit()
    return {"reordered": len(payload.section_ids)}


@router.get("/by-trip/{trip_id}", response_model=List[SectionResponse])
def list_sections(
    trip_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _own_trip(trip_id, user, db)
    rows = (
        db.query(TripSection)
        .filter(TripSection.trip_id == trip_id)
        .order_by(TripSection.order_index)
        .all()
    )
    return [_serialize(s) for s in rows]
