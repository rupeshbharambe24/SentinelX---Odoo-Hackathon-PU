import uuid
from pathlib import Path
from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import get_current_user
from app.models import City, SavedDestination, User
from app.schemas.city import CityResponse
from app.schemas.user import UserProfile, UserProfileUpdate


router = APIRouter()

UPLOAD_DIR = Path("uploads/avatars")


@router.get("/me/profile", response_model=UserProfile)
def get_profile(user: User = Depends(get_current_user)):
    return user


@router.put("/me/profile", response_model=UserProfile)
def update_profile(
    payload: UserProfileUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user


@router.post("/me/photo", response_model=UserProfile)
async def upload_photo(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Must be an image")
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    ext = Path(file.filename or "img.jpg").suffix or ".jpg"
    name = f"{user.id}_{uuid.uuid4().hex}{ext}"
    (UPLOAD_DIR / name).write_bytes(await file.read())
    user.photo_url = f"/static/avatars/{name}"
    db.commit()
    db.refresh(user)
    return user


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.delete(user)
    db.commit()


@router.get("/me/saved-destinations", response_model=List[CityResponse])
def list_saved(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return (
        db.query(City)
        .join(SavedDestination, SavedDestination.city_id == City.id)
        .filter(SavedDestination.user_id == user.id)
        .all()
    )


@router.post("/me/saved-destinations/{city_id}", status_code=status.HTTP_201_CREATED)
def add_saved(
    city_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not db.query(City).filter(City.id == city_id).first():
        raise HTTPException(status.HTTP_404_NOT_FOUND, "City not found")
    if not db.query(SavedDestination).filter_by(user_id=user.id, city_id=city_id).first():
        db.add(SavedDestination(user_id=user.id, city_id=city_id))
        db.commit()
    return {"saved": True}


@router.delete("/me/saved-destinations/{city_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_saved(
    city_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.query(SavedDestination).filter_by(user_id=user.id, city_id=city_id).delete()
    db.commit()
