import uuid
from datetime import datetime
from sqlalchemy import String, Float, Integer, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.database import Base


class Claim(Base):
    __tablename__ = "claims"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"))
    policy_id: Mapped[str] = mapped_column(String, ForeignKey("policies.id"))
    trigger_event: Mapped[str] = mapped_column(String(50))
    trigger_value: Mapped[str] = mapped_column(String(50), nullable=True)
    trigger_hours: Mapped[float] = mapped_column(Float, default=6.0)
    payout_amount: Mapped[float] = mapped_column(Float)
    fraud_score: Mapped[float] = mapped_column(Float, default=0.0)
    fraud_tier: Mapped[int] = mapped_column(Integer, default=1)
    status: Mapped[str] = mapped_column(String(20), default="Pending")
    payout_ref: Mapped[str] = mapped_column(String(100), nullable=True)
    payout_provider: Mapped[str] = mapped_column(String(50), nullable=True)
    payout_method: Mapped[str] = mapped_column(String(20), nullable=True)
    review_reason: Mapped[str] = mapped_column(String(255), nullable=True)
    event_key: Mapped[str] = mapped_column(String(120), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    paid_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="claims")
    policy: Mapped["Policy"] = relationship("Policy", back_populates="claims")
