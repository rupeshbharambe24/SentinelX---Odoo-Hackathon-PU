from datetime import date
from sqlalchemy import String, Date, Float, Integer, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, uuid_pk


class TripSection(Base):
    __tablename__ = "trip_sections"

    id: Mapped[str] = uuid_pk()
    trip_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("trips.id", ondelete="CASCADE"), nullable=False, index=True
    )
    city_id: Mapped[int | None] = mapped_column(
        ForeignKey("cities.id", ondelete="SET NULL"), nullable=True
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    start_date: Mapped[date | None] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date)
    section_budget: Mapped[float | None] = mapped_column(Float)
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    trip = relationship("Trip", back_populates="sections")
    activities = relationship(
        "TripActivity",
        back_populates="section",
        cascade="all, delete-orphan",
        order_by="TripActivity.order_index",
    )
    expenses = relationship("Expense", back_populates="section")
    notes = relationship("TripNote", back_populates="section")
    city = relationship("City")
