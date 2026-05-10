from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class PostCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    content: Optional[str] = None
    trip_id: Optional[str] = None
    images: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    city_id: Optional[int] = None


class PostUpdate(BaseModel):
    title: Optional[str] = Field(default=None, max_length=200)
    content: Optional[str] = None
    images: Optional[List[str]] = None
    tags: Optional[List[str]] = None


class PostResponse(BaseModel):
    id: str
    user_id: str
    user_name: Optional[str]
    title: str
    content: Optional[str]
    images: Optional[List[str]]
    tags: Optional[List[str]]
    city_id: Optional[int]
    likes_count: int
    comments_count: int
    created_at: datetime


class CommentCreate(BaseModel):
    content: str = Field(min_length=1)


class CommentResponse(BaseModel):
    id: str
    post_id: str
    user_id: str
    user_name: Optional[str]
    content: Optional[str]
    created_at: datetime
