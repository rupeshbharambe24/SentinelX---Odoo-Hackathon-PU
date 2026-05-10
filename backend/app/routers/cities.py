from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models import ActivityTemplate, City
from app.schemas.city import ActivityTemplateResponse, CityResponse, SemanticSearchHit


router = APIRouter()


@router.get("/cities", response_model=List[CityResponse])
def list_cities(
    q: Optional[str] = None,
    country: Optional[str] = None,
    sort: str = Query(default="-popularity_score"),
    limit: int = Query(default=50, le=200),
    db: Session = Depends(get_db),
):
    qry = db.query(City)
    if q:
        like = f"%{q.lower()}%"
        qry = qry.filter(or_(func.lower(City.name).like(like), func.lower(City.country).like(like)))
    if country:
        qry = qry.filter(City.country == country)
    sort_col = sort.lstrip("-")
    direction = "desc" if sort.startswith("-") else "asc"
    if sort_col not in ("popularity_score", "name", "cost_index"):
        sort_col = "popularity_score"
    col = getattr(City, sort_col)
    qry = qry.order_by(col.desc().nullslast() if direction == "desc" else col.asc().nullslast())
    return qry.limit(limit).all()


@router.get("/cities/recommended", response_model=List[CityResponse])
def recommended(limit: int = Query(default=12, le=50), db: Session = Depends(get_db)):
    return (
        db.query(City)
        .order_by(City.popularity_score.desc().nullslast())
        .limit(limit)
        .all()
    )


@router.get("/cities/search/semantic", response_model=List[SemanticSearchHit])
def semantic_search(
    q: str,
    limit: int = Query(default=10, le=50),
    db: Session = Depends(get_db),
):
    """Substring fallback when no embeddings; word-overlap scoring once Member C populates them."""
    rows = db.query(City).filter(City.embedding.isnot(None)).limit(2000).all()
    if not rows:
        like = f"%{q.lower()}%"
        rows = (
            db.query(City)
            .filter(or_(func.lower(City.name).like(like), func.lower(City.description).like(like)))
            .limit(limit)
            .all()
        )
        return [SemanticSearchHit(city=c, score=1.0) for c in rows]

    q_terms = set(q.lower().split())
    scored = []
    for c in rows:
        haystack = f"{c.name} {c.country or ''} {c.description or ''}".lower()
        score = sum(1 for t in q_terms if t in haystack) / max(1, len(q_terms))
        if score > 0:
            scored.append((c, score))
    scored.sort(key=lambda x: x[1], reverse=True)
    return [SemanticSearchHit(city=c, score=s) for c, s in scored[:limit]]


@router.get("/cities/{city_id}", response_model=CityResponse)
def get_city(city_id: int, db: Session = Depends(get_db)):
    c = db.query(City).filter(City.id == city_id).first()
    if not c:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "City not found")
    return c


@router.get("/activity-templates", response_model=List[ActivityTemplateResponse])
def list_activity_templates(
    q: Optional[str] = None,
    city_id: Optional[int] = None,
    category: Optional[str] = None,
    max_cost: Optional[float] = None,
    limit: int = Query(default=50, le=200),
    db: Session = Depends(get_db),
):
    qry = db.query(ActivityTemplate)
    if q:
        like = f"%{q.lower()}%"
        qry = qry.filter(
            or_(
                func.lower(ActivityTemplate.name).like(like),
                func.lower(ActivityTemplate.description).like(like),
            )
        )
    if city_id:
        qry = qry.filter(ActivityTemplate.city_id == city_id)
    if category:
        qry = qry.filter(ActivityTemplate.category == category)
    if max_cost is not None:
        qry = qry.filter(ActivityTemplate.avg_cost <= max_cost)
    return qry.limit(limit).all()


@router.get("/activity-templates/{template_id}", response_model=ActivityTemplateResponse)
def get_activity_template(template_id: int, db: Session = Depends(get_db)):
    t = db.query(ActivityTemplate).filter(ActivityTemplate.id == template_id).first()
    if not t:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Template not found")
    return t
