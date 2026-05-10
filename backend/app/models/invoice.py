from datetime import date
from sqlalchemy import String, Date, Float, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, uuid_pk


class Invoice(Base):
    __tablename__ = "invoices"

    id: Mapped[str] = uuid_pk()
    trip_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("trips.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    invoice_number: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    generated_date: Mapped[date | None] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending|paid|cancelled
    subtotal: Mapped[float] = mapped_column(Float, default=0.0)
    tax_percent: Mapped[float] = mapped_column(Float, default=5.0)
    tax_amount: Mapped[float] = mapped_column(Float, default=0.0)
    discount: Mapped[float] = mapped_column(Float, default=0.0)
    grand_total: Mapped[float] = mapped_column(Float, default=0.0)
    traveler_details: Mapped[dict | None] = mapped_column(JSONB)

    trip = relationship("Trip", back_populates="invoice")
    items = relationship(
        "InvoiceItem",
        back_populates="invoice",
        cascade="all, delete-orphan",
        order_by="InvoiceItem.order_index",
    )


class InvoiceItem(Base):
    __tablename__ = "invoice_items"

    id: Mapped[str] = uuid_pk()
    invoice_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True
    )
    category: Mapped[str | None] = mapped_column(String(50))
    description: Mapped[str | None] = mapped_column(String(500))
    quantity_or_details: Mapped[str | None] = mapped_column(String(200))
    unit_cost: Mapped[float] = mapped_column(Float, default=0.0)
    amount: Mapped[float] = mapped_column(Float, default=0.0)
    order_index: Mapped[int] = mapped_column(Integer, default=0)

    invoice = relationship("Invoice", back_populates="items")
