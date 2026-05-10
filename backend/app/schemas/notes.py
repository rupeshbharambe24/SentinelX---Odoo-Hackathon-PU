from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class NoteCreate(BaseModel):
    trip_id: str
    section_id: Optional[str] = None
    title: Optional[str] = Field(default=None, max_length=200)
    content: Optional[str] = None
    day_index: Optional[int] = None


class NoteUpdate(BaseModel):
    title: Optional[str] = Field(default=None, max_length=200)
    content: Optional[str] = None
    day_index: Optional[int] = None


class NoteResponse(BaseModel):
    id: str
    trip_id: str
    section_id: Optional[str]
    title: Optional[str]
    content: Optional[str]
    day_index: Optional[int]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
