"""
app/routers/admin.py — Admin analytics endpoints.

All endpoints require admin-level authentication (get_admin_user dependency).
Prefix "/admin" is added in main.py — do NOT add it here.
"""
from datetime import date, datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy import distinct, func
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import get_admin_user
from app.models import ActivityTemplate, City, Trip, TripActivity, TripSection, User
from app.schemas.admin import (
    AdminStats,
    PopularActivity,
    PopularCity,
    TrendPoint,
    UserAdminView,
)

# NO prefix here — main.py already adds prefix="/admin"
router = APIRouter(tags=["admin"])


@router.get("/stats", response_model=AdminStats)
def get_stats(
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    today = date.today()
    cutoff_30d = datetime.utcnow() - timedelta(days=30)

    # No last_active column — approximate "active in last 30d" as
    # "users who created a trip in the last 30 days"
    active = (
        db.query(func.count(distinct(Trip.user_id)))
        .filter(Trip.created_at >= cutoff_30d)
        .scalar() or 0
    )

    return AdminStats(
        total_users=db.query(User).count(),
        total_trips=db.query(Trip).count(),
        trips_today=db.query(Trip).filter(func.date(Trip.created_at) == today).count(),
        active_users_30d=active,
    )


@router.get("/popular/cities", response_model=List[PopularCity])
def popular_cities(
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    rows = (
        db.query(
            City.id,
            City.name,
            City.country,
            func.count(TripSection.id).label("visit_count"),
        )
        .join(TripSection, TripSection.city_id == City.id)
        .group_by(City.id)
        .order_by(func.count(TripSection.id).desc())
        .limit(limit)
        .all()
    )
    return [
        PopularCity(
            city_id=r.id,
            name=r.name,
            country=r.country,
            visit_count=r.visit_count,
        )
        for r in rows
    ]


@router.get("/popular/activities", response_model=List[PopularActivity])
def popular_activities(
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    rows = (
        db.query(
            ActivityTemplate.id,
            ActivityTemplate.name,
            City.name.label("city_name"),
            func.count(TripActivity.id).label("usage_count"),
        )
        .outerjoin(City, City.id == ActivityTemplate.city_id)
        .join(TripActivity, TripActivity.template_id == ActivityTemplate.id)
        .group_by(ActivityTemplate.id, City.name)
        .order_by(func.count(TripActivity.id).desc())
        .limit(limit)
        .all()
    )
    return [
        PopularActivity(
            template_id=r.id,
            name=r.name,
            city_name=r.city_name,
            usage_count=r.usage_count,
        )
        for r in rows
    ]


@router.get("/users", response_model=List[UserAdminView])
def list_users(
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    # Flat list. last_active = MAX(trip.created_at) per user.
    rows = (
        db.query(
            User,
            func.count(Trip.id).label("trip_count"),
            func.max(Trip.created_at).label("last_active"),
        )
        .outerjoin(Trip, Trip.user_id == User.id)
        .group_by(User.id)
        .all()
    )
    return [
        UserAdminView(
            id=str(u.id),
            email=u.email,
            first_name=u.first_name,
            last_name=u.last_name,
            trip_count=trip_count,
            last_active=last_active,
            is_admin=u.is_admin,
            created_at=u.created_at,
        )
        for u, trip_count, last_active in rows
    ]


@router.get("/trends", response_model=List[TrendPoint])
def trends(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    cutoff = date.today() - timedelta(days=days)
    rows = (
        db.query(
            func.date(Trip.created_at).label("d"),
            func.count().label("n"),
        )
        .filter(Trip.created_at >= cutoff)
        .group_by(func.date(Trip.created_at))
        .order_by("d")
        .all()
    )
    return [TrendPoint(date=r.d, trips_created=r.n) for r in rows]


@router.get("/recent")
def recent(
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    """Free-form endpoint — returns list of dicts. No frozen schema."""
    rows = db.query(Trip).order_by(Trip.created_at.desc()).limit(limit).all()
    return [
        {
            "id": str(t.id),
            "name": t.name,
            "user_id": str(t.user_id),
            "created_at": t.created_at,
        }
        for t in rows
    ]
