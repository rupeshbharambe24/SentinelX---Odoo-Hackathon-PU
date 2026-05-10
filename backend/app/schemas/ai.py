from typing import List, Literal
from pydantic import BaseModel, Field


class ItineraryRequest(BaseModel):
    destination: str = Field(min_length=1, max_length=200)
    days: int = Field(ge=1, le=30)
    interests: List[str] = []
    budget_usd: float = Field(ge=0)


class ActivitySuggestion(BaseModel):
    name: str
    category: str
    cost: float
    duration_min: int
    description: str


class SectionSuggestion(BaseModel):
    title: str
    start_day: int
    end_day: int
    budget: float
    activities: List[ActivitySuggestion]


class ItineraryResponse(BaseModel):
    sections: List[SectionSuggestion]
    total_estimated_cost: float


class PackingItemSchema(BaseModel):
    name: str
    category: Literal["documents", "clothing", "electronics", "toiletries", "other"]


class TripSummaryResponse(BaseModel):
    summary: str
