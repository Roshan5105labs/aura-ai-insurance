from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta
import uuid

from app.db.database import get_db
from app.models.user import User
from app.models.policy import Policy
from app.schemas.policy import PolicyResponse, TriggerStatus, RenewResponse
from app.services.trigger_engine import evaluate_triggers
from app.services.risk_engine import compute_risk_score
from app.services.trigger_engine import get_weather, get_aqi

router = APIRouter()

ZONE_RISK_INT = {
    "dadar": 2, "dharavi": 3, "kurla": 2,
    "andheri": 2, "bandra": 1, "cp": 2,
}


@router.get("/policy/{user_id}", response_model=PolicyResponse)
async def get_policy(user_id: str, db: AsyncSession = Depends(get_db)):
    user = (await db.execute(
        select(User).where(User.id == user_id)
    )).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    policy = (await db.execute(
        select(Policy)
        .where(Policy.user_id == user_id, Policy.status == "Active")
        .order_by(Policy.created_at.desc())
    )).scalar_one_or_none()
    if not policy:
        raise HTTPException(status_code=404, detail="No active policy")

    if datetime.utcnow() > policy.expiry_date:
        policy.status = "Expired"
        await db.commit()
        raise HTTPException(status_code=400, detail="Policy expired")

    triggers = await evaluate_triggers(user.city, user.zone)

    return PolicyResponse(
        status          = policy.status,
        expiry_date     = policy.expiry_date.strftime("%Y-%m-%d"),
        weekly_premium  = policy.weekly_premium,
        coverage_amount = policy.coverage_amount,
        current_triggers=[
            TriggerStatus(
                type      = t["type"],
                value     = t["value"],
                is_active = t["is_active"],
                payout    = t.get("payout", 0),
            )
            for t in triggers
        ],
    )


@router.post("/policy/{user_id}/renew", response_model=RenewResponse)
async def renew_policy(user_id: str, db: AsyncSession = Depends(get_db)):
    """
    Renews a worker's policy for another 7 days.
    Re-runs the ML risk engine with fresh weather data to recalculate premium.
    Expires the old policy and creates a new one.
    """
    user = (await db.execute(
        select(User).where(User.id == user_id)
    )).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Expire any existing active policy
    old_policy = (await db.execute(
        select(Policy)
        .where(Policy.user_id == user_id, Policy.status == "Active")
        .order_by(Policy.created_at.desc())
    )).scalar_one_or_none()

    if old_policy:
        old_policy.status = "Renewed"

    # Re-run ML with fresh data
    w   = await get_weather(user.city)
    aqi = await get_aqi(user.city)
    zone_risk_int = ZONE_RISK_INT.get(user.zone.lower(), 2)

    ml = compute_risk_score(
        rainfall_mm     = w["rain_1h"],
        aqi             = aqi,
        zone_risk       = zone_risk_int,
        hours_per_week  = user.hours_per_week,
        vehicle_age_yrs = user.vehicle_age_yrs,
        past_claims     = user.past_claims,
        gig_tenure_yrs  = user.gig_tenure_yrs,
    )

    # Update user risk score
    user.risk_score  = ml["risk_score"]
    user.risk_bucket = ml["risk_bucket"]

    now = datetime.utcnow()
    new_policy = Policy(
        id                    = str(uuid.uuid4()),
        user_id               = user.id,
        status                = "Active",
        weekly_premium        = ml["weekly_premium"],
        coverage_amount       = ml["coverage_amount"],
        risk_bucket           = ml["risk_bucket"],
        start_date            = now,
        expiry_date           = now + timedelta(days=7),
        covers_income_loss_only = True,
    )
    db.add(new_policy)
    await db.commit()

    return RenewResponse(
        policy_id       = new_policy.id,
        expiry_date     = new_policy.expiry_date.strftime("%Y-%m-%d"),
        weekly_premium  = ml["weekly_premium"],
        coverage_amount = ml["coverage_amount"],
        risk_bucket     = ml["risk_bucket"],
        risk_score      = ml["risk_score"],
        confidence      = ml["confidence"],
    )
