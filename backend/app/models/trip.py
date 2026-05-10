from datetime import date
from sqlalchemy import String, Date, Float, Boolean, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, uuid_pk, created_at_col, updated_at_col


class Trip(Base):
    __tablename__ = "trips"

    id: Mapped[str] = uuid_pk()
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    start_date: Mapped[date | None] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date)
    cover_photo_url: Mapped[str | None] = mapped_column(String(500))
    total_budget: Mapped[float | None] = mapped_column(Float)
    is_public: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    public_slug: Mapped[str | None] = mapped_column(String(100), unique=True, index=True)
    is_template: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at = created_at_col()
    updated_at = updated_at_col()

    user = relationship("User", back_populates="trips")
    sections = relationship(
        "TripSection",
        back_populates="trip",
        cascade="all, delete-orphan",
        order_by="TripSection.order_index",
    )
    expenses = relationship("Expense", back_populates="trip", cascade="all, delete-orphan")
    packing_items = relationship("PackingItem", back_populates="trip", cascade="all, delete-orphan")
    notes = relationship("TripNote", back_populates="trip", cascade="all, delete-orphan")
    invoice = relationship(
        "Invoice", back_populates="trip", uselist=False, cascade="all, delete-orphan"
    )


class SavedDestination(Base):
    __tablename__ = "saved_destinations"

    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    city_id: Mapped[int] = mapped_column(
        ForeignKey("cities.id", ondelete="CASCADE"), primary_key=True
    )
    saved_at = created_at_col()


class TripCopy(Base):
    __tablename__ = "trip_copies"

    id: Mapped[str] = uuid_pk()
    original_trip_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("trips.id", ondelete="SET NULL"), nullable=True
    )
    copied_trip_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("trips.id", ondelete="CASCADE"), nullable=False
    )
    copied_by_user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    copied_at = created_at_col()
