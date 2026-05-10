from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import (
    create_access_token,
    decode_token,
    get_current_user,
    hash_password,
    verify_password,
)
from app.models import User
from app.schemas.auth import (
    ForgotPasswordRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserLogin,
    UserRegister,
)
from app.schemas.user import UserProfile


router = APIRouter()


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegister, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Email already registered")
    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        first_name=payload.first_name,
        last_name=payload.last_name,
        phone=payload.phone,
        city=payload.city,
        country=payload.country,
        photo_url=payload.photo_url,
        additional_info=payload.additional_info,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token(user.id, {"is_admin": user.is_admin})
    return TokenResponse(access_token=token, user_id=user.id, is_admin=user.is_admin)


@router.post("/login", response_model=TokenResponse)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid credentials")
    token = create_access_token(user.id, {"is_admin": user.is_admin})
    return TokenResponse(access_token=token, user_id=user.id, is_admin=user.is_admin)


@router.post("/refresh", response_model=TokenResponse)
def refresh(user: User = Depends(get_current_user)):
    token = create_access_token(user.id, {"is_admin": user.is_admin})
    return TokenResponse(access_token=token, user_id=user.id, is_admin=user.is_admin)


@router.get("/me", response_model=UserProfile)
def me(user: User = Depends(get_current_user)):
    return user


# Demo-mode forgot/reset: returns the reset token in the response so the
# frontend can wire the flow without an email pipeline.
@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        return {"message": "If account exists, reset email sent.", "reset_token": None}
    token = create_access_token(user.id, {"purpose": "reset"})
    return {"message": "Reset token issued (demo mode).", "reset_token": token}


@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    data = decode_token(payload.token)
    if data.get("purpose") != "reset":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Not a reset token")
    user = db.query(User).filter(User.id == data["sub"]).first()
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    user.password_hash = hash_password(payload.new_password)
    db.commit()
    return {"message": "Password reset"}
