from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class UserProfile(BaseModel):
    id: str
    email: EmailStr
    first_name: Optional[str]
    last_name: Optional[str]
    phone: Optional[str]
    city: Optional[str]
    country: Optional[str]
    photo_url: Optional[str]
    additional_info: Optional[str]
    is_admin: bool

    model_config = {"from_attributes": True}


class UserProfileUpdate(BaseModel):
    first_name: Optional[str] = Field(default=None, max_length=100)
    last_name: Optional[str] = Field(default=None, max_length=100)
    phone: Optional[str] = Field(default=None, max_length=30)
    city: Optional[str] = Field(default=None, max_length=100)
    country: Optional[str] = Field(default=None, max_length=100)
    additional_info: Optional[str] = None
    language: Optional[str] = Field(default=None, max_length=10)
