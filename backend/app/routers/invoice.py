"""
backend/app/routers/invoice.py
--------------------------------
FastAPI router for invoice management + PDF export.

Tags   : ["invoice"]  (set in main.py)

Adapted for backend:
  - Uses app.core.db.get_db  and  app.core.security.get_current_user
  - Trip.id / Invoice.id are UUID strings
  - Invoice model: separate InvoiceItem rows + traveler_details JSONB
  - Invoice status values: "pending" | "paid" | "cancelled"
  - No line_items_json — items are stored in invoice_items table
"""
from __future__ import annotations

import datetime
import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import get_current_user
from app.models.invoice import Invoice, InvoiceItem
from app.models.trip import Trip
from app.models.user import User
from app.schemas.invoice import InvoiceData, InvoiceItemSchema, InvoiceUpdate
from app.services.invoice.builder import build_invoice_from_expenses
from app.services.invoice.pdf import render_invoice_pdf

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_trip_or_404(trip_id: str, user_id: str, db: Session) -> Trip:
    trip = db.query(Trip).filter(Trip.id == trip_id, Trip.user_id == user_id).first()
    if not trip:
        raise HTTPException(404, f"Trip {trip_id} not found.")
    return trip


def _get_invoice_or_404(invoice_id: str, db: Session) -> Invoice:
    inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not inv:
        raise HTTPException(404, f"Invoice {invoice_id} not found.")
    return inv


def _orm_invoice_to_data(inv: Invoice) -> InvoiceData:
    """Convert ORM Invoice model → InvoiceData schema."""
    items = [
        InvoiceItemSchema(
            category=item.category or "",
            description=item.description or "",
            quantity_or_details=item.quantity_or_details or "",
            unit_cost=item.unit_cost,
            amount=item.amount,
        )
        for item in (inv.items or [])
    ]
    return InvoiceData(
        id=inv.id,
        trip_id=inv.trip_id,
        invoice_number=inv.invoice_number,
        generated_date=inv.generated_date,
        status=inv.status,
        items=items,
        subtotal=inv.subtotal,
        tax_percent=inv.tax_percent,
        tax_amount=inv.tax_amount,
        discount=inv.discount,
        grand_total=inv.grand_total,
        traveler_details=inv.traveler_details or {},
    )


def _persist_invoice(invoice_data: InvoiceData, db: Session) -> Invoice:
    """Insert or update the Invoice row + InvoiceItem rows."""
    existing = (
        db.query(Invoice).filter(Invoice.trip_id == invoice_data.trip_id).first()
    )
    if existing:
        # Update fields
        existing.invoice_number = invoice_data.invoice_number
        existing.generated_date = invoice_data.generated_date
        existing.status = invoice_data.status
        existing.subtotal = invoice_data.subtotal
        existing.tax_percent = invoice_data.tax_percent
        existing.tax_amount = invoice_data.tax_amount
        existing.discount = invoice_data.discount
        existing.grand_total = invoice_data.grand_total
        existing.traveler_details = invoice_data.traveler_details
        # Replace items
        for old_item in list(existing.items):
            db.delete(old_item)
        db.flush()
        inv = existing
    else:
        inv = Invoice(
            id=invoice_data.id,
            trip_id=invoice_data.trip_id,
            invoice_number=invoice_data.invoice_number,
            generated_date=invoice_data.generated_date,
            status=invoice_data.status,
            subtotal=invoice_data.subtotal,
            tax_percent=invoice_data.tax_percent,
            tax_amount=invoice_data.tax_amount,
            discount=invoice_data.discount,
            grand_total=invoice_data.grand_total,
            traveler_details=invoice_data.traveler_details,
        )
        db.add(inv)
        db.flush()

    for idx, item in enumerate(invoice_data.items):
        db.add(
            InvoiceItem(
                id=str(uuid.uuid4()),
                invoice_id=inv.id,
                category=item.category,
                description=item.description,
                quantity_or_details=item.quantity_or_details,
                unit_cost=item.unit_cost,
                amount=item.amount,
                order_index=idx,
            )
        )
    db.commit()
    db.refresh(inv)
    return inv


# ── GET /trips/{trip_id}/invoice ──────────────────────────────────────────────

@router.get(
    "/trips/{trip_id}/invoice",
    response_model=InvoiceData,
    summary="Get or auto-generate invoice",
)
def get_invoice(
    trip_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> InvoiceData:
    """Returns existing invoice; auto-generates and persists one if it doesn't exist yet."""
    _get_trip_or_404(trip_id, user.id, db)

    inv = db.query(Invoice).filter(Invoice.trip_id == trip_id).first()
    if inv:
        return _orm_invoice_to_data(inv)

    # Auto-generate + persist
    invoice_data = build_invoice_from_expenses(trip_id, db)
    _persist_invoice(invoice_data, db)
    return invoice_data


# ── POST /trips/{trip_id}/invoice/generate ────────────────────────────────────

@router.post(
    "/trips/{trip_id}/invoice/generate",
    response_model=InvoiceData,
    summary="Recompute invoice from current expenses",
)
def generate_invoice(
    trip_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> InvoiceData:
    """Recomputes the invoice from scratch using latest expense data and persists it."""
    _get_trip_or_404(trip_id, user.id, db)
    invoice_data = build_invoice_from_expenses(trip_id, db)
    _persist_invoice(invoice_data, db)
    return invoice_data


# ── PUT /trips/{trip_id}/invoice ──────────────────────────────────────────────

@router.put(
    "/trips/{trip_id}/invoice",
    response_model=InvoiceData,
    summary="Update tax % or discount",
)
def update_invoice(
    trip_id: str,
    payload: InvoiceUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> InvoiceData:
    _get_trip_or_404(trip_id, user.id, db)

    tax = payload.tax_percent
    discount = payload.discount

    invoice_data = build_invoice_from_expenses(
        trip_id,
        db,
        tax_percent=tax if tax is not None else 5.0,
        discount=discount if discount is not None else 0.0,
    )

    existing = db.query(Invoice).filter(Invoice.trip_id == trip_id).first()
    if existing:
        if tax is not None:
            existing.tax_percent = tax
            existing.tax_amount = invoice_data.tax_amount
        if discount is not None:
            existing.discount = discount
        existing.grand_total = invoice_data.grand_total
        db.commit()
    else:
        _persist_invoice(invoice_data, db)

    return invoice_data


# ── POST /invoices/{invoice_id}/mark-paid ─────────────────────────────────────

@router.post(
    "/invoices/{invoice_id}/mark-paid",
    summary="Mark invoice as PAID",
)
def mark_paid(
    invoice_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    inv = _get_invoice_or_404(invoice_id, db)
    inv.status = "paid"
    db.commit()
    logger.info("Invoice %s marked as PAID by user %s", invoice_id, user.id)
    return {"message": f"Invoice {invoice_id} marked as PAID.", "status": "paid"}


# ── GET /invoices/{invoice_id}/pdf ────────────────────────────────────────────

@router.get(
    "/invoices/{invoice_id}/pdf",
    summary="Download invoice as PDF",
    responses={200: {"content": {"application/pdf": {}}}},
)
def download_pdf(
    invoice_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> StreamingResponse:
    inv = _get_invoice_or_404(invoice_id, db)
    invoice_data = _orm_invoice_to_data(inv)

    pdf_bytes = render_invoice_pdf(invoice_data)

    filename = f"traveloop-invoice-{invoice_data.invoice_number}.pdf"
    return StreamingResponse(
        iter([pdf_bytes]),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
