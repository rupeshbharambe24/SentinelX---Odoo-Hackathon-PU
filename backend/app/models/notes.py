from sqlalchemy import String, Integer, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, uuid_pk, created_at_col, updated_at_col


class TripNote(Base):
    __tablename__ = "trip_notes"

    id: Mapped[str] = uuid_pk()
    trip_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("trips.id", ondelete="CASCADE"), nullable=False, index=True
    )
    section_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("trip_sections.id", ondelete="SET NULL"), nullable=True
    )
    title: Mapped[str | None] = mapped_column(String(200))
    content: Mapped[str | None] = mapped_column(Text)
    day_index: Mapped[int | None] = mapped_column(Integer)
    created_at = created_at_col()
    updated_at = updated_at_col()

    trip = relationship("Trip", back_populates="notes")
    section = relationship("TripSection", back_populates="notes")
