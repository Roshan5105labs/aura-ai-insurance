import uuid
from datetime import datetime
from sqlalchemy import String, Float, Integer, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.database import Base


from typing import Optional

class User(Base):
    __tablename__ = "users"

    id                  : Mapped[str]   = mapped_column(String,     primary_key=True, default=lambda: str(uuid.uuid4()))
    name                : Mapped[str]   = mapped_column(String(100))
    hashed_password     : Mapped[Optional[str]] = mapped_column(String(255), nullable=True) # password support
    platform            : Mapped[str]   = mapped_column(String(20))
    zone                : Mapped[str]   = mapped_column(String(100))
    city                : Mapped[str]   = mapped_column(String(100), default="Mumbai")
    avg_daily_earnings  : Mapped[float] = mapped_column(Float)
    risk_score          : Mapped[float] = mapped_column(Float,   default=0.5)
    risk_bucket         : Mapped[str]   = mapped_column(String(10), default="Medium")
    # ML feature columns
    hours_per_week      : Mapped[float] = mapped_column(Float,   default=48.0)
    vehicle_age_yrs     : Mapped[float] = mapped_column(Float,   default=2.0)
    past_claims         : Mapped[int]   = mapped_column(Integer, default=0)
    gig_tenure_yrs      : Mapped[float] = mapped_column(Float,   default=1.0)
    created_at          : Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    policies : Mapped[list["Policy"]] = relationship("Policy", back_populates="user", lazy="selectin")
    claims   : Mapped[list["Claim"]]  = relationship("Claim",  back_populates="user", lazy="selectin")
