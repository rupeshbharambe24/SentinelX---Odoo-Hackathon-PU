from datetime import date
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field


class InvoiceItemSchema(BaseModel):
    category: str
    description: str
    quantity_or_details: str
    unit_cost: float
    amount: float


class InvoiceData(BaseModel):
    id: str
    trip_id: str
    invoice_number: str
    generated_date: Optional[date]
    status: Literal["pending", "paid", "cancelled"]
    items: List[InvoiceItemSchema]
    subtotal: float
    tax_percent: float
    tax_amount: float
    discount: float
    grand_total: float
    traveler_details: Dict[str, Any]


class InvoiceUpdate(BaseModel):
    tax_percent: Optional[float] = Field(default=None, ge=0, le=100)
    discount: Optional[float] = Field(default=None, ge=0)
