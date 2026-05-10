from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import get_current_user
from app.models import PackingItem, Trip, User
from app.schemas.packing import PackingItemCreate, PackingItemResponse


router = APIRouter()


def _own_trip(trip_id: str, user: User, db: Session) -> Trip:
    trip = db.query(Trip).filter(Trip.id == trip_id, Trip.user_id == user.id).first()
    if not trip:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Trip not found")
    return trip


@router.get("/trips/{trip_id}/packing", response_model=List[PackingItemResponse])
def list_items(
    trip_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _own_trip(trip_id, user, db)
    return (
        db.query(PackingItem)
        .filter(PackingItem.trip_id == trip_id)
        .order_by(PackingItem.order_index)
        .all()
    )


@router.post("/packing", response_model=PackingItemResponse, status_code=status.HTTP_201_CREATED)
def add_item(
    payload: PackingItemCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _own_trip(payload.trip_id, user, db)
    next_idx = db.query(PackingItem).filter_by(trip_id=payload.trip_id).count()
    item = PackingItem(**payload.model_dump(), order_index=next_idx)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/packing/{item_id}/toggle", response_model=PackingItemResponse)
def toggle(
    item_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = db.query(PackingItem).filter(PackingItem.id == item_id).first()
    if not item:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Item not found")
    _own_trip(item.trip_id, user, db)
    item.is_packed = not item.is_packed
    db.commit()
    db.refresh(item)
    return item


@router.delete("/packing/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove(
    item_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = db.query(PackingItem).filter(PackingItem.id == item_id).first()
    if not item:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Item not found")
    _own_trip(item.trip_id, user, db)
    db.delete(item)
    db.commit()


@router.post("/trips/{trip_id}/packing/reset")
def reset(
    trip_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _own_trip(trip_id, user, db)
    db.query(PackingItem).filter(PackingItem.trip_id == trip_id).delete()
    db.commit()
    return {"reset": True}
