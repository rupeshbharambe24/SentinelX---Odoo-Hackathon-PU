from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel


class AdminStats(BaseModel):
    total_users: int
    total_trips: int
    trips_today: int
    active_users_30d: int


class PopularCity(BaseModel):
    city_id: int
    name: str
    country: Optional[str]
    visit_count: int


class PopularActivity(BaseModel):
    template_id: int
    name: str
    city_name: Optional[str]
    usage_count: int


class UserAdminView(BaseModel):
    id: str
    email: str
    first_name: Optional[str]
    last_name: Optional[str]
    trip_count: int
    last_active: Optional[datetime]
    is_admin: bool
    created_at: datetime


class TrendPoint(BaseModel):
    date: date
    trips_created: int
