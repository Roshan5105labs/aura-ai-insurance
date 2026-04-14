from pydantic import BaseModel
from typing import Optional

class ClaimResponse(BaseModel):
    claim_id     : str
    trigger_event: str
    timestamp    : str
    payout_amount: float
    status       : str
    fraud_tier   : int
    fraud_score  : float = 0.0
    review_reason: Optional[str] = None
    payout_ref   : Optional[str] = None
    payout_provider: Optional[str] = None
    payout_method: Optional[str] = None
    notification_channel: Optional[str] = None

class ClaimTriggerRequest(BaseModel):
    # user_id is taken from URL path — not duplicated here
    zone                  : str
    city                  : str
    avg_speed_kmph        : float = 28.0
    max_speed_kmph        : float = 45.0
    tower_changes_per_hour: float = 3.0
    spatial_claim_density : int   = 1
    platform_pings        : int   = 15
