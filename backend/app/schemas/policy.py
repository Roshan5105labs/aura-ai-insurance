from pydantic import BaseModel
from typing import List, Optional, Dict


class TriggerStatus(BaseModel):
    type     : str
    value    : str
    is_active: bool
    payout   : Optional[int] = 0


class PolicyResponse(BaseModel):
    status          : str
    expiry_date     : str
    weekly_premium  : int
    coverage_amount : int
    current_triggers: List[TriggerStatus]


class RenewResponse(BaseModel):
    policy_id      : str
    expiry_date    : str
    weekly_premium : int
    coverage_amount: int
    risk_bucket    : str
    risk_score     : float
    confidence     : Optional[Dict[str, float]] = None
