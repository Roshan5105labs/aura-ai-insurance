from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models.claim import Claim
from app.models.policy import Policy
from app.models.user import User
from app.services.communication_service import build_claim_notification, build_policy_notification

router = APIRouter()


@router.get("/notifications/{user_id}")
async def get_notifications(user_id: str, db: AsyncSession = Depends(get_db)):
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    policy = (
        await db.execute(
            select(Policy)
            .where(Policy.user_id == user.id, Policy.status == "Active")
            .order_by(Policy.created_at.desc())
        )
    ).scalar_one_or_none()

    claims = (
        await db.execute(
            select(Claim)
            .where(Claim.user_id == user.id)
            .order_by(Claim.created_at.desc())
            .limit(5)
        )
    ).scalars().all()

    timeline = []
    if policy and policy.expiry_date <= datetime.utcnow() + timedelta(days=2):
        timeline.append(
            build_policy_notification(
                worker_name=user.name,
                weekly_premium=policy.weekly_premium,
                expiry_date=policy.expiry_date,
            )
        )

    for claim in claims:
        timeline.append(
            build_claim_notification(
                worker_name=user.name,
                trigger_event=claim.trigger_event,
                payout_amount=claim.payout_amount,
                status=claim.status,
                city=user.city,
                zone=user.zone,
                reasons=[claim.review_reason] if claim.review_reason else None,
            )
        )

    return sorted(timeline, key=lambda item: item["timestamp"], reverse=True)
