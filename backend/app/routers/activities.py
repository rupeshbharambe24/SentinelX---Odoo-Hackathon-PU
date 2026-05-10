from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import get_current_user
from app.models import TripActivity, TripSection, User
from app.schemas.activity import ActivityCreate, ActivityReorder, ActivityResponse, ActivityUpdate


router = APIRouter()


def _own_section(section_id: str, user: User, db: Session) -> TripSection:
    sect = db.query(TripSection).filter(TripSection.id == section_id).first()
    if not sect or sect.trip.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Section not found")
    return sect


@router.post("", response_model=ActivityResponse, status_code=status.HTTP_201_CREATED)
def create_activity(
    payload: ActivityCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _own_section(payload.section_id, user, db)
    next_idx = db.query(TripActivity).filter_by(section_id=payload.section_id).count()
    a = TripActivity(**payload.model_dump(), order_index=next_idx)
    db.add(a)
    db.commit()
    db.refresh(a)
    return a


@router.put("/{activity_id}", response_model=ActivityResponse)
def update_activity(
    activity_id: str,
    payload: ActivityUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    a = db.query(TripActivity).filter(TripActivity.id == activity_id).first()
    if not a:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Activity not found")
    _own_section(a.section_id, user, db)
    if payload.next_activity_id and payload.next_activity_id != activity_id:
        nxt = db.query(TripActivity).filter(TripActivity.id == payload.next_activity_id).first()
        if not nxt or nxt.section_id != a.section_id:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "next_activity_id must be in same section")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(a, k, v)
    db.commit()
    db.refresh(a)
    return a


@router.delete("/{activity_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_activity(
    activity_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    a = db.query(TripActivity).filter(TripActivity.id == activity_id).first()
    if not a:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Activity not found")
    _own_section(a.section_id, user, db)
    db.delete(a)
    db.commit()


@router.post("/reorder")
def reorder(
    payload: ActivityReorder,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _own_section(payload.section_id, user, db)
    rows = db.query(TripActivity).filter(TripActivity.section_id == payload.section_id).all()
    by_id = {a.id: a for a in rows}
    if set(payload.activity_ids) != set(by_id.keys()):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "activity_ids must be exactly the activities of this section",
        )
    for idx, aid in enumerate(payload.activity_ids):
        by_id[aid].order_index = idx
    db.commit()
    return {"reordered": len(payload.activity_ids)}
