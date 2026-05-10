from typing import Optional
from pydantic import BaseModel


class CityResponse(BaseModel):
    id: int
    name: str
    country: Optional[str]
    region: Optional[str]
    lat: Optional[float]
    lng: Optional[float]
    cost_index: Optional[float]
    popularity_score: Optional[float]
    photo_url: Optional[str]
    description: Optional[str]

    model_config = {"from_attributes": True}


class ActivityTemplateResponse(BaseModel):
    id: int
    city_id: Optional[int]
    name: str
    category: Optional[str]
    avg_cost: Optional[float]
    avg_duration_min: Optional[int]
    description: Optional[str]
    photo_url: Optional[str]

    model_config = {"from_attributes": True}


class SemanticSearchHit(BaseModel):
    city: CityResponse
    score: float
