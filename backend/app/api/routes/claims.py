from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
import uuid

from app.db.database import get_db
from app.models.user import User
from app.models.policy import Policy
from app.models.claim import Claim
from app.schemas.claim import ClaimResponse, ClaimTriggerRequest
from app.services.trigger_engine import evaluate_triggers, disruption_hours, stackable_payout
from app.services.payout_service import initiate_payout
from app.core.config import COVERAGE_FACTOR

router = APIRouter()

LABEL_MAP = {
    "Rain"        : "Heavy Rain",
    "Heat"        : "Extreme Heat",
    "AQI"         : "Hazardous AQI",
    "Wind"        : "High Winds",
    "Curfew"      : "Zone Curfew",
    "OrderCrash"  : "Platform Order Crash",
    "SocialDisrupt": "Social Disruption",
}


@router.get("/claims/{user_id}", response_model=list[ClaimResponse])
async def get_claims(user_id: str, db: AsyncSession = Depends(get_db)):
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    claims = (await db.execute(
        select(Claim).where(Claim.user_id == user_id).order_by(Claim.created_at.desc())
    )).scalars().all()
    return [ClaimResponse(
        claim_id      = c.id,
        trigger_event = c.trigger_event,
        timestamp     = c.created_at.isoformat() + "Z",
        payout_amount = c.payout_amount,
        status        = c.status,
        fraud_tier    = c.fraud_tier,
    ) for c in claims]


@router.post("/claims/trigger/{user_id}", response_model=ClaimResponse)
async def trigger_claim(
    user_id : str,
    payload : ClaimTriggerRequest,
    bg      : BackgroundTasks,
    db      : AsyncSession = Depends(get_db),
):
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    policy = (await db.execute(
        select(Policy)
        .where(Policy.user_id == user_id, Policy.status == "Active")
        .order_by(Policy.created_at.desc())
    )).scalar_one_or_none()
    if not policy:
        raise HTTPException(status_code=400, detail="No active policy")
    if datetime.utcnow() > policy.expiry_date:
        raise HTTPException(status_code=400, detail="Policy expired")

    # ── ML Trigger Engine ────────────────────────────────────
    triggers = await evaluate_triggers(payload.city, payload.zone)
    active   = [t for t in triggers if t["is_active"]]
    if not active:
        raise HTTPException(status_code=400, detail="No active trigger — no claim created")

    # ── Stackable payout (per INTEGRATION_GUIDE) ─────────────
    ml_payout = stackable_payout(triggers)          # ₹500+₹300+₹400 etc stack
    hours     = disruption_hours(triggers)

    # Use whichever is higher: ML stackable payout OR earnings-formula
    earnings_payout = round((user.avg_daily_earnings / 12) * hours * COVERAGE_FACTOR, 2)
    payout = max(ml_payout, earnings_payout)
    payout = min(payout, user.avg_daily_earnings)   # cap at 1 day earnings

    # ── Fraud Tier (Isolation Forest logic) ──────────────────
    tier = 1
    if payload.max_speed_kmph > 100 or payload.spatial_claim_density > 20:
        tier = 3
    elif payload.platform_pings < 3:
        tier = 2
    if tier == 3:
        payout = round(payout * 0.5, 2)

    primary = active[0]
    claim = Claim(
        id            = str(uuid.uuid4()),
        user_id       = user.id,
        policy_id     = policy.id,
        trigger_event = LABEL_MAP.get(primary["type"], primary["type"]),
        trigger_value = primary["value"],
        trigger_hours = hours,
        payout_amount = payout,
        fraud_tier    = tier,
        status        = "Approved" if tier == 1 else "UnderReview",
    )
    db.add(claim)
    await db.flush()
    if tier == 1:
        bg.add_task(_pay, claim.id, payout, db)
    await db.commit()

    return ClaimResponse(
        claim_id      = claim.id,
        trigger_event = claim.trigger_event,
        timestamp     = claim.created_at.isoformat() + "Z",
        payout_amount = payout,
        status        = claim.status,
        fraud_tier    = tier,
    )


async def _pay(claim_id: str, amount: float, db: AsyncSession):
    result = await initiate_payout(claim_id, amount)
    async with db.begin():
        c = (await db.execute(select(Claim).where(Claim.id == claim_id))).scalar_one_or_none()
        if c:
            c.status     = "Paid"
            c.payout_ref = result["payout_ref"]
            c.paid_at    = datetime.utcnow()
