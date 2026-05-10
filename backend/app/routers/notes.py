from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import get_current_user
from app.models import Trip, TripNote, TripSection, User
from app.schemas.notes import NoteCreate, NoteResponse, NoteUpdate


router = APIRouter()


def _own_trip(trip_id: str, user: User, db: Session) -> Trip:
    trip = db.query(Trip).filter(Trip.id == trip_id, Trip.user_id == user.id).first()
    if not trip:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Trip not found")
    return trip


@router.get("/trips/{trip_id}/notes", response_model=List[NoteResponse])
def list_notes(
    trip_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _own_trip(trip_id, user, db)
    return (
        db.query(TripNote)
        .filter(TripNote.trip_id == trip_id)
        .order_by(TripNote.created_at.desc())
        .all()
    )


@router.post("/notes", response_model=NoteResponse, status_code=status.HTTP_201_CREATED)
def create_note(
    payload: NoteCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _own_trip(payload.trip_id, user, db)
    if payload.section_id:
        if not db.query(TripSection).filter_by(id=payload.section_id, trip_id=payload.trip_id).first():
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "section_id does not belong to trip")
    n = TripNote(**payload.model_dump())
    db.add(n)
    db.commit()
    db.refresh(n)
    return n


@router.put("/notes/{note_id}", response_model=NoteResponse)
def update_note(
    note_id: str,
    payload: NoteUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    n = db.query(TripNote).filter(TripNote.id == note_id).first()
    if not n:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Note not found")
    _own_trip(n.trip_id, user, db)
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(n, k, v)
    db.commit()
    db.refresh(n)
    return n


@router.delete("/notes/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note(
    note_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    n = db.query(TripNote).filter(TripNote.id == note_id).first()
    if not n:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Note not found")
    _own_trip(n.trip_id, user, db)
    db.delete(n)
    db.commit()
