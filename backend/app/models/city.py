from sqlalchemy import String, Float, Integer, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class City(Base):
    __tablename__ = "cities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    country: Mapped[str | None] = mapped_column(String(100), index=True)
    region: Mapped[str | None] = mapped_column(String(100))
    lat: Mapped[float | None] = mapped_column(Float)
    lng: Mapped[float | None] = mapped_column(Float)
    cost_index: Mapped[float | None] = mapped_column(Float)
    popularity_score: Mapped[float | None] = mapped_column(Float)
    photo_url: Mapped[str | None] = mapped_column(String(500))
    description: Mapped[str | None] = mapped_column(Text)
    # Embedding stored as JSON-encoded TEXT for portability. If pgvector is
    # enabled on the deployment Postgres later, swap this column to vector(384).
    embedding: Mapped[str | None] = mapped_column(Text)

    activity_templates = relationship(
        "ActivityTemplate",
        back_populates="city",
        cascade="all, delete-orphan",
    )


class ActivityTemplate(Base):
    __tablename__ = "activity_templates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    city_id: Mapped[int | None] = mapped_column(
        ForeignKey("cities.id", ondelete="CASCADE"), nullable=True, index=True
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    category: Mapped[str | None] = mapped_column(String(50), index=True)
    avg_cost: Mapped[float | None] = mapped_column(Float)
    avg_duration_min: Mapped[int | None] = mapped_column(Integer)
    description: Mapped[str | None] = mapped_column(Text)
    photo_url: Mapped[str | None] = mapped_column(String(500))
    embedding: Mapped[str | None] = mapped_column(Text)

    city = relationship("City", back_populates="activity_templates")
