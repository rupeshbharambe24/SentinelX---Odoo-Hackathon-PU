"""
backend/app/services/invoice/builder.py
-----------------------------------------
Builds an InvoiceData object from a trip's expenses stored in the DB.

Public API
----------
    build_invoice_from_expenses(trip_id: str, db: Session) -> InvoiceData

Note: Adapted for backend model differences:
  - Trip.id / Expense.trip_id / Invoice.id are all UUID strings
  - Trip has no `destination` field; city names come from TripSection.city.name
  - Expense has `note` (not `description`/`name`) and `category`
  - Invoice model uses separate InvoiceItem rows + traveler_details JSON
  - Backend invoice schema uses InvoiceItemSchema / InvoiceData with `items` list
"""
from __future__ import annotations

import datetime
import logging
import uuid
from collections import defaultdict
from typing import List

from sqlalchemy.orm import Session

from app.schemas.invoice import InvoiceData, InvoiceItemSchema

logger = logging.getLogger(__name__)


def _next_invoice_number(trip_id: str) -> str:
    """Deterministic invoice number: INV-YYYY-<last 4 chars of trip UUID>."""
    year = datetime.date.today().year
    short = trip_id.replace("-", "")[-6:].upper()
    return f"INV-{year}-{short}"


def _get_destination(trip, db: Session) -> str:
    """Best-effort: grab city names from sections, fall back to trip name."""
    try:
        from app.models.section import TripSection  # noqa: PLC0415

        sections = (
            db.query(TripSection)
            .filter(TripSection.trip_id == trip.id)
            .order_by(TripSection.order_index)
            .all()
        )
        cities = []
        for sec in sections:
            if sec.city and sec.city.name:
                cities.append(sec.city.name)
            elif sec.title:
                cities.append(sec.title)
        if cities:
            # Deduplicate while preserving order
            seen = set()
            unique = []
            for c in cities:
                if c not in seen:
                    seen.add(c)
                    unique.append(c)
            return ", ".join(unique[:3])
    except Exception as exc:
        logger.warning("Could not resolve destination from sections: %s", exc)
    return trip.name  # fallback


def build_invoice_from_expenses(
    trip_id: str,
    db: Session,
    tax_percent: float = 5.0,
    discount: float = 0.0,
) -> InvoiceData:
    """
    1. Fetch trip + expenses from DB.
    2. Group expenses by category → one line item per category.
    3. Compute subtotal, tax, grand_total.
    4. Return a fully-populated InvoiceData (not persisted here).
    """
    from app.models.trip import Trip  # noqa: PLC0415
    from app.models.expense import Expense  # noqa: PLC0415

    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if trip is None:
        raise ValueError(f"Trip {trip_id} not found")

    expenses = db.query(Expense).filter(Expense.trip_id == trip_id).all()

    # Group by category
    grouped: dict[str, List] = defaultdict(list)
    for exp in expenses:
        cat = (exp.category or "Other").title()
        grouped[cat].append(exp)

    line_items: List[InvoiceItemSchema] = []
    for category, exps in sorted(grouped.items()):
        total_amount = sum(float(e.amount) for e in exps)
        # Expense.note is the description field in backend model
        notes = ", ".join(
            (e.note or category) for e in exps[:3] if e.note
        ) or category
        if len(exps) > 3:
            notes += f" (+{len(exps) - 3} more)"

        line_items.append(
            InvoiceItemSchema(
                category=category,
                description=notes,
                quantity_or_details=f"{len(exps)} expense(s)",
                unit_cost=round(total_amount / len(exps), 2),
                amount=round(total_amount, 2),
            )
        )

    subtotal = round(sum(li.amount for li in line_items), 2)
    tax_amount = round(subtotal * tax_percent / 100, 2)
    grand_total = round(subtotal + tax_amount - discount, 2)

    # Traveler info from trip.user relation
    traveler_name = "Traveler"
    traveler_email = ""
    try:
        if trip.user:
            first = trip.user.first_name or ""
            last = trip.user.last_name or ""
            traveler_name = f"{first} {last}".strip() or trip.user.email
            traveler_email = trip.user.email
    except Exception:
        pass

    destination = _get_destination(trip, db)
    travel_dates = f"{trip.start_date} – {trip.end_date}"

    invoice = InvoiceData(
        id=str(uuid.uuid4()),
        trip_id=trip_id,
        invoice_number=_next_invoice_number(trip_id),
        generated_date=datetime.date.today(),
        status="pending",
        items=line_items,
        subtotal=subtotal,
        tax_percent=tax_percent,
        tax_amount=tax_amount,
        discount=discount,
        grand_total=grand_total,
        traveler_details={
            "name": traveler_name,
            "email": traveler_email,
            "trip_name": trip.name,
            "destination": destination,
            "travel_dates": travel_dates,
        },
    )
    logger.info(
        "Built invoice %s: %d line items, grand total $%.2f",
        invoice.invoice_number,
        len(line_items),
        grand_total,
    )
    return invoice
