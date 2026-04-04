from pydantic import BaseModel, Field
from typing import Literal, Optional

class OnboardRequest(BaseModel):
    name                : str
    password            : str
    platform            : Literal["Swiggy", "Zomato", "Zepto", "Blinkit", "Amazon"]
    zone                : str
    city                : str = "Mumbai"
    avg_daily_earnings  : float = Field(gt=0)
    # ── ML pricing engine inputs ─────────────────────────────
    hours_per_week      : float = Field(default=48.0, ge=10, le=84)
    vehicle_age_yrs     : float = Field(default=2.0,  ge=0,  le=15)
    past_claims         : int   = Field(default=0,    ge=0,  le=5)
    gig_tenure_yrs      : float = Field(default=1.0,  ge=0,  le=10)

class OnboardResponse(BaseModel):
    user_id         : str
    risk_score      : float
    risk_bucket     : str
    weekly_premium  : int
    coverage_amount : int
    confidence      : Optional[dict] = None

class LoginRequest(BaseModel):
    name  : str
    password: str
    phone : Optional[str] = None
