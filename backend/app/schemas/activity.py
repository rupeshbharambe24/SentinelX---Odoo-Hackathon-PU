from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class ActivityCreate(BaseModel):
    section_id: str
    template_id: Optional[int] = None
    name: str = Field(min_length=1, max_length=200)
    category: Optional[str] = Field(default=None, max_length=50)
    cost: float = Field(default=0.0, ge=0)
    duration_min: int = Field(default=0, ge=0)
    scheduled_at: Optional[datetime] = None
    notes: Optional[str] = None


class ActivityUpdate(BaseModel):
    name: Optional[str] = Field(default=None, max_length=200)
    category: Optional[str] = Field(default=None, max_length=50)
    cost: Optional[float] = Field(default=None, ge=0)
    duration_min: Optional[int] = Field(default=None, ge=0)
    scheduled_at: Optional[datetime] = None
    notes: Optional[str] = None
    next_activity_id: Optional[str] = None


class ActivityResponse(BaseModel):
    id: str
    section_id: str
    template_id: Optional[int]
    name: str
    category: Optional[str]
    cost: float
    duration_min: int
    scheduled_at: Optional[datetime]
    notes: Optional[str]
    order_index: int
    next_activity_id: Optional[str]

    model_config = {"from_attributes": True}


class ActivityReorder(BaseModel):
    section_id: str
    activity_ids: List[str]
