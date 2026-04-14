from datetime import datetime, timedelta
import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models.claim import Claim
from app.models.policy import Policy
from app.models.user import User
from app.schemas.claim import ClaimResponse, ClaimTriggerRequest
from app.services.communication_service import build_claim_notification
from app.services.fraud_engine import assess_claim_telemetry
from app.services.payout_service import initiate_payout
from app.services.trigger_engine import (
    build_event_key,
    disruption_hours,
    evaluate_triggers,
    stackable_payout,
)
from app.core.config import COVERAGE_FACTOR

router = APIRouter()

LABEL_MAP = {
    "Rain": "Heavy Rain",
    "Heat": "Extreme Heat",
    "AQI": "Hazardous AQI",
    "Wind": "High Winds",
    "ZoneRisk": "High-Risk Zone",
    "SocialDisrupt": "Social Disruption",
}


def _serialize_claim(c: Claim) -> ClaimResponse:
    return ClaimResponse(
        claim_id=c.id,
        trigger_event=c.trigger_event,
        timestamp=c.created_at.isoformat() + "Z",
        payout_amount=c.payout_amount,
        status=c.status,
        fraud_tier=c.fraud_tier,
        fraud_score=c.fraud_score or 0.0,
        review_reason=c.review_reason,
        payout_ref=c.payout_ref,
        payout_provider=c.payout_provider,
        payout_method=c.payout_method,
        notification_channel="WhatsApp",
    )


@router.get("/claims/{user_id}", response_model=list[ClaimResponse])
async def get_claims(user_id: str, db: AsyncSession = Depends(get_db)):
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    claims = (
        await db.execute(
            select(Claim).where(Claim.user_id == user_id).order_by(Claim.created_at.desc())
        )
    ).scalars().all()
    return [_serialize_claim(c) for c in claims]


@router.post("/claims/trigger/{user_id}", response_model=ClaimResponse)
async def trigger_claim(
    user_id: str,
    payload: ClaimTriggerRequest,
    bg: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    policy = (
        await db.execute(
            select(Policy)
            .where(Policy.user_id == user_id, Policy.status == "Active")
            .order_by(Policy.created_at.desc())
        )
    ).scalar_one_or_none()
    if not policy:
        raise HTTPException(status_code=400, detail="No active policy")
    if datetime.utcnow() > policy.expiry_date:
        policy.status = "Expired"
        await db.commit()
        raise HTTPException(status_code=400, detail="Policy expired")

    triggers = await evaluate_triggers(payload.city, payload.zone)
    active = [t for t in triggers if t["is_active"]]
    if not active:
        raise HTTPException(status_code=400, detail="No active trigger - no claim created")

    event_key = build_event_key(payload.city, payload.zone, triggers)
    cooldown_start = datetime.utcnow() - timedelta(hours=4)
    duplicate = (
        await db.execute(
            select(Claim).where(
                Claim.user_id == user.id,
                Claim.event_key == event_key,
                Claim.created_at >= cooldown_start,
            )
        )
    ).scalar_one_or_none()
    if duplicate:
        raise HTTPException(
            status_code=409,
            detail="A claim for this disruption window already exists for the worker",
        )

    hours = disruption_hours(triggers)
    ml_payout = stackable_payout(triggers)
    earnings_payout = round((user.avg_daily_earnings / 12) * hours * COVERAGE_FACTOR, 2)
    payout = max(ml_payout, earnings_payout)
    payout = min(payout, user.avg_daily_earnings)

    fraud = assess_claim_telemetry(
        avg_speed_kmph=payload.avg_speed_kmph,
        max_speed_kmph=payload.max_speed_kmph,
        tower_changes_per_hour=payload.tower_changes_per_hour,
        spatial_claim_density=payload.spatial_claim_density,
        platform_pings=payload.platform_pings,
    )

    review_reason = None if fraud.tier == 1 else "; ".join(fraud.reasons[:2])
    if fraud.tier == 3:
        payout = round(payout * 0.5, 2)

    primary = active[0]
    claim = Claim(
        id=str(uuid.uuid4()),
        user_id=user.id,
        policy_id=policy.id,
        trigger_event=LABEL_MAP.get(primary["type"], primary["type"]),
        trigger_value=primary["value"],
        trigger_hours=hours,
        payout_amount=payout,
        fraud_score=fraud.score,
        fraud_tier=fraud.tier,
        status="Approved" if fraud.tier == 1 else "UnderReview",
        review_reason=review_reason,
        event_key=event_key,
    )
    db.add(claim)
    await db.flush()

    notification = build_claim_notification(
        worker_name=user.name,
        trigger_event=claim.trigger_event,
        payout_amount=payout,
        status=claim.status,
        city=user.city,
        zone=user.zone,
        reasons=fraud.reasons,
    )

    if fraud.tier == 1:
        bg.add_task(_pay, claim.id, payout, db)

    await db.commit()
    response = _serialize_claim(claim)
    response.notification_channel = notification["channel"]
    return response


async def _pay(claim_id: str, amount: float, db: AsyncSession):
    result = await initiate_payout(claim_id, amount)
    async with db.begin():
        c = (await db.execute(select(Claim).where(Claim.id == claim_id))).scalar_one_or_none()
        if not c:
            return
        c.payout_ref = result["payout_ref"]
        c.payout_provider = result.get("provider")
        c.payout_method = result.get("method")
        c.status = "Paid" if result.get("status") == "Processed" else result.get("status", "Processing")
        if result.get("paid_at"):
            c.paid_at = datetime.fromisoformat(result["paid_at"].replace("Z", ""))
