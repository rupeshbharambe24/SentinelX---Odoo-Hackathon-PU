from datetime import datetime
from sqlalchemy import String, Float, Integer, Text, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, uuid_pk


class TripActivity(Base):
    __tablename__ = "trip_activities"

    id: Mapped[str] = uuid_pk()
    section_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("trip_sections.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    template_id: Mapped[int | None] = mapped_column(
        ForeignKey("activity_templates.id", ondelete="SET NULL"), nullable=True
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    category: Mapped[str | None] = mapped_column(String(50))
    cost: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    duration_min: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    notes: Mapped[str | None] = mapped_column(Text)
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    next_activity_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("trip_activities.id", ondelete="SET NULL"),
        nullable=True,
    )

    section = relationship("TripSection", back_populates="activities")
    template = relationship("ActivityTemplate")
