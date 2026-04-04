import uuid, logging
from datetime import datetime
from app.core.config import RAZORPAY_KEY_ID
logger = logging.getLogger(__name__)

async def initiate_payout(claim_id: str, amount_inr: float) -> dict:
    ref = f"pout_{uuid.uuid4().hex[:12]}"
    logger.info(f"[MOCK UPI] ₹{amount_inr} → claim {claim_id[:8]} | ref {ref}")
    return {"payout_ref": ref, "status": "processed", "paid_at": datetime.utcnow().isoformat()}