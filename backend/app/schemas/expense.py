from datetime import date
from typing import Dict, List, Literal, Optional
from pydantic import BaseModel, Field


ExpenseCategory = Literal["transport", "stay", "activity", "meal", "other"]


class ExpenseCreate(BaseModel):
    trip_id: str
    section_id: Optional[str] = None
    category: ExpenseCategory
    amount: float = Field(gt=0)
    currency: str = Field(default="USD", max_length=3)
    note: Optional[str] = None
    expense_date: date


class ExpenseUpdate(BaseModel):
    section_id: Optional[str] = None
    category: Optional[ExpenseCategory] = None
    amount: Optional[float] = Field(default=None, gt=0)
    currency: Optional[str] = Field(default=None, max_length=3)
    note: Optional[str] = None
    expense_date: Optional[date] = None


class ExpenseResponse(BaseModel):
    id: str
    trip_id: str
    section_id: Optional[str]
    category: str
    amount: float
    currency: str
    note: Optional[str]
    expense_date: Optional[date]

    model_config = {"from_attributes": True}


class BudgetBreakdown(BaseModel):
    by_category: Dict[str, float]
    by_day: Dict[str, float]
    total_spent: float
    total_budget: Optional[float]
    over_budget_days: List[str]
