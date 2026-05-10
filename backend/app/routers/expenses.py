from collections import defaultdict
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import get_current_user
from app.models import Expense, Trip, TripSection, User
from app.schemas.expense import (
    BudgetBreakdown,
    ExpenseCreate,
    ExpenseResponse,
    ExpenseUpdate,
)


router = APIRouter()


def _own_trip(trip_id: str, user: User, db: Session) -> Trip:
    trip = db.query(Trip).filter(Trip.id == trip_id, Trip.user_id == user.id).first()
    if not trip:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Trip not found")
    return trip


@router.get("/trips/{trip_id}/expenses", response_model=List[ExpenseResponse])
def list_expenses(
    trip_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _own_trip(trip_id, user, db)
    return (
        db.query(Expense)
        .filter(Expense.trip_id == trip_id)
        .order_by(Expense.expense_date.desc())
        .all()
    )


@router.post("/expenses", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
def create_expense(
    payload: ExpenseCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _own_trip(payload.trip_id, user, db)
    if payload.section_id:
        if not db.query(TripSection).filter_by(id=payload.section_id, trip_id=payload.trip_id).first():
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "section_id does not belong to trip")
    e = Expense(**payload.model_dump())
    db.add(e)
    db.commit()
    db.refresh(e)
    return e


@router.put("/expenses/{expense_id}", response_model=ExpenseResponse)
def update_expense(
    expense_id: str,
    payload: ExpenseUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    e = db.query(Expense).filter(Expense.id == expense_id).first()
    if not e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Expense not found")
    _own_trip(e.trip_id, user, db)
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(e, k, v)
    db.commit()
    db.refresh(e)
    return e


@router.delete("/expenses/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(
    expense_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    e = db.query(Expense).filter(Expense.id == expense_id).first()
    if not e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Expense not found")
    _own_trip(e.trip_id, user, db)
    db.delete(e)
    db.commit()


@router.get("/trips/{trip_id}/budget-breakdown", response_model=BudgetBreakdown)
def breakdown(
    trip_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    trip = _own_trip(trip_id, user, db)
    expenses = db.query(Expense).filter(Expense.trip_id == trip_id).all()
    by_cat: dict[str, float] = defaultdict(float)
    by_day: dict[str, float] = defaultdict(float)
    for e in expenses:
        by_cat[e.category] += e.amount
        if e.expense_date:
            by_day[e.expense_date.isoformat()] += e.amount
    total_spent = sum(by_cat.values())
    over: List[str] = []
    if trip.total_budget and trip.start_date and trip.end_date:
        days = max(1, (trip.end_date - trip.start_date).days + 1)
        per_day_budget = trip.total_budget / days
        over = [d for d, amt in by_day.items() if amt > per_day_budget]
    return BudgetBreakdown(
        by_category=dict(by_cat),
        by_day=dict(by_day),
        total_spent=total_spent,
        total_budget=trip.total_budget,
        over_budget_days=over,
    )
