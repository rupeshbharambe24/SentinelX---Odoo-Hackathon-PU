from datetime import date
from typing import List, Optional
from pydantic import BaseModel, Field

from app.schemas.activity import ActivityResponse


class SectionCreate(BaseModel):
    trip_id: str
    city_id: Optional[int] = None
    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    section_budget: Optional[float] = Field(default=None, ge=0)


class SectionUpdate(BaseModel):
    city_id: Optional[int] = None
    title: Optional[str] = Field(default=None, max_length=200)
    description: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    section_budget: Optional[float] = Field(default=None, ge=0)


class SectionResponse(BaseModel):
    id: str
    trip_id: str
    city_id: Optional[int]
    city_name: Optional[str]
    title: str
    description: Optional[str]
    start_date: Optional[date]
    end_date: Optional[date]
    section_budget: Optional[float]
    order_index: int
    activities: List[ActivityResponse] = []

    model_config = {"from_attributes": True}


class SectionReorder(BaseModel):
    trip_id: str
    section_ids: List[str]
