from typing import Literal
from pydantic import BaseModel, Field


PackingCategory = Literal["documents", "clothing", "electronics", "toiletries", "other"]


class PackingItemCreate(BaseModel):
    trip_id: str
    name: str = Field(min_length=1, max_length=200)
    category: PackingCategory = "other"


class PackingItemResponse(BaseModel):
    id: str
    trip_id: str
    name: str
    category: str
    is_packed: bool
    order_index: int

    model_config = {"from_attributes": True}
