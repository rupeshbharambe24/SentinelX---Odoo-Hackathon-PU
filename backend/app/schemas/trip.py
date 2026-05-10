from datetime import date, datetime
from typing import Literal, Optional
from pydantic import BaseModel, Field


class TripCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: Optional[str] = None
    start_date: date
    end_date: date
    cover_photo_url: Optional[str] = Field(default=None, max_length=500)
    total_budget: Optional[float] = Field(default=None, ge=0)


class TripUpdate(BaseModel):
    name: Optional[str] = Field(default=None, max_length=200)
    description: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    cover_photo_url: Optional[str] = Field(default=None, max_length=500)
    total_budget: Optional[float] = Field(default=None, ge=0)


class TripResponse(BaseModel):
    id: str
    user_id: str
    name: str
    description: Optional[str]
    start_date: Optional[date]
    end_date: Optional[date]
    cover_photo_url: Optional[str]
    total_budget: Optional[float]
    status: Literal["ongoing", "upcoming", "completed", "draft"]
    is_public: bool
    public_slug: Optional[str]
    section_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


class PublishResponse(BaseModel):
    public_slug: str
    public_url: str
