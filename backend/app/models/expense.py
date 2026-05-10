from datetime import date
from sqlalchemy import String, Date, Float, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, uuid_pk


class Expense(Base):
    __tablename__ = "expenses"

    id: Mapped[str] = uuid_pk()
    trip_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("trips.id", ondelete="CASCADE"), nullable=False, index=True
    )
    section_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("trip_sections.id", ondelete="SET NULL"), nullable=True
    )
    category: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="USD")
    note: Mapped[str | None] = mapped_column(Text)
    expense_date: Mapped[date | None] = mapped_column(Date)

    trip = relationship("Trip", back_populates="expenses")
    section = relationship("TripSection", back_populates="expenses")
