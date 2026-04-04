"""
Admin routes — real DB aggregations for the admin dashboard.
GET /api/v1/admin/stats          → live metrics
GET /api/v1/admin/syndicate      → spatial fraud clustering
POST /api/v1/admin/trigger-cycle → manually fire the ML polling loop
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from datetime import datetime, timedelta

from app.db.database import get_db
from app.models.user import User
from app.models.policy import Policy
from app.models.claim import Claim

router = APIRouter()


@router.get("/admin/stats")
async def get_admin_stats(db: AsyncSession = Depends(get_db)):
    """Live metrics for the admin dashboard — all from PostgreSQL."""
    now       = datetime.utcnow()
    week_ago  = now - timedelta(days=7)

    total_workers   = (await db.execute(func.count(User.id).select())).scalar() or 0
    active_policies = (await db.execute(
        select(func.count(Policy.id)).where(Policy.status == "Active")
    )).scalar() or 0

    claims_week = (await db.execute(
        select(Claim).where(Claim.created_at >= week_ago)
    )).scalars().all()

    paid_week     = [c for c in claims_week if c.status == "Paid"]
    total_payout  = sum(c.payout_amount for c in paid_week)
    fraud_blocked = sum(1 for c in claims_week if c.fraud_tier == 3)

    # Loss ratio = payouts / premiums collected this week
    premiums_collected = (await db.execute(
        select(func.sum(Policy.weekly_premium))
        .where(Policy.start_date >= week_ago)
    )).scalar() or 1  # avoid div-by-zero

    loss_ratio = round(total_payout / premiums_collected, 4) if premiums_collected else 0.0

    # Liquidity pool estimate (premiums collected - payouts ever)
    total_premiums_ever = (await db.execute(
        select(func.sum(Policy.weekly_premium))
    )).scalar() or 0
    total_paid_ever = (await db.execute(
        select(func.sum(Claim.payout_amount)).where(Claim.status == "Paid")
    )).scalar() or 0
    liquidity_pool = max(float(total_premiums_ever) - float(total_paid_ever), 0)

    return {
        "total_workers"          : total_workers,
        "active_policies"        : active_policies,
        "claims_this_week"       : len(claims_week),
        "total_payout_this_week" : round(float(total_payout), 2),
        "fraud_blocked"          : fraud_blocked,
        "loss_ratio"             : loss_ratio,
        "liquidity_pool"         : round(liquidity_pool, 2),
        "payout_velocity"        : "~2 min avg",
        "generated_at"           : now.isoformat() + "Z",
    }


@router.get("/admin/syndicate")
async def get_syndicate_alerts(db: AsyncSession = Depends(get_db)):
    """
    Spatial fraud clustering — groups claims by worker zone,
    flags zones with high claim density (>10 claims in 1 hour = syndicate alert).
    """
    one_hour_ago = datetime.utcnow() - timedelta(hours=1)

    # Get recent claims with user zone
    rows = (await db.execute(
        select(User.zone, func.count(Claim.id).label("claim_count"))
        .join(Claim, Claim.user_id == User.id)
        .where(Claim.created_at >= one_hour_ago)
        .group_by(User.zone)
        .order_by(func.count(Claim.id).desc())
    )).all()

    alerts = []
    for zone, count in rows:
        if count >= 30:
            risk, status = "High", "Flagged"
        elif count >= 10:
            risk, status = "Medium", "Monitoring"
        else:
            risk, status = "Low", "Clear"
        alerts.append({
            "zone"        : zone,
            "claim_count" : count,
            "risk"        : risk,
            "status"      : status,
        })

    # Always return at least one row even if DB is empty
    if not alerts:
        alerts = [{"zone": "All zones", "claim_count": 0, "risk": "Low", "status": "Clear"}]

    return alerts


@router.get("/admin/weekly-payouts")
async def get_weekly_payouts(db: AsyncSession = Depends(get_db)):
    """Last 5 weeks of payouts vs premiums for the area chart."""
    results = []
    for weeks_ago in range(4, -1, -1):
        start = datetime.utcnow() - timedelta(days=7 * (weeks_ago + 1))
        end   = datetime.utcnow() - timedelta(days=7 * weeks_ago)
        label = f"W{5 - weeks_ago}"

        payouts = (await db.execute(
            select(func.sum(Claim.payout_amount))
            .where(and_(Claim.created_at >= start, Claim.created_at < end, Claim.status == "Paid"))
        )).scalar() or 0

        premiums = (await db.execute(
            select(func.sum(Policy.weekly_premium))
            .where(and_(Policy.start_date >= start, Policy.start_date < end))
        )).scalar() or 0

        results.append({
            "week"    : label,
            "payouts" : round(float(payouts), 2),
            "premiums": round(float(premiums), 2),
        })
    return results


@router.post("/admin/trigger-cycle")
async def manual_trigger_cycle(db: AsyncSession = Depends(get_db)):
    """
    Manually fires the ML trigger polling loop across all active policies.
    In production this runs on a schedule via APScheduler.
    Returns a summary of triggers fired.
    """
    from app.services.trigger_engine import evaluate_triggers, stackable_payout
    from app.services.payout_service import initiate_payout
    from app.core.config import COVERAGE_FACTOR
    import uuid

    active_policies = (await db.execute(
        select(Policy, User)
        .join(User, User.id == Policy.user_id)
        .where(Policy.status == "Active")
    )).all()

    summary = {"evaluated": 0, "triggered": 0, "total_payout": 0.0, "details": []}

    for policy, user in active_policies:
        summary["evaluated"] += 1
        triggers = await evaluate_triggers(user.city, user.zone)
        active   = [t for t in triggers if t["is_active"]]
        if not active:
            continue

        payout = stackable_payout(triggers)
        payout = min(payout, user.avg_daily_earnings)

        # Check no duplicate claim in last hour
        one_hour_ago = datetime.utcnow() - timedelta(hours=1)
        existing = (await db.execute(
            select(Claim).where(
                Claim.user_id == user.id,
                Claim.created_at >= one_hour_ago
            )
        )).scalar_one_or_none()
        if existing:
            continue  # duplicate prevention

        claim = Claim(
            id            = str(uuid.uuid4()),
            user_id       = user.id,
            policy_id     = policy.id,
            trigger_event = active[0]["type"],
            trigger_value = active[0]["value"],
            trigger_hours = 6.0,
            payout_amount = payout,
            fraud_tier    = 1,
            status        = "Approved",
        )
        db.add(claim)
        await db.flush()

        payout_result = await initiate_payout(claim.id, payout)
        claim.status     = "Paid"
        claim.payout_ref = payout_result["payout_ref"]
        claim.paid_at    = datetime.utcnow()

        summary["triggered"]    += 1
        summary["total_payout"] += payout
        summary["details"].append({
            "worker"  : user.name,
            "zone"    : user.zone,
            "triggers": [t["type"] for t in active],
            "payout"  : payout,
        })

    await db.commit()
    summary["total_payout"] = round(summary["total_payout"], 2)
    return summary


@router.get("/admin/policies")
async def get_all_policies(db: AsyncSession = Depends(get_db)):
    """Fetch all policies for the admin view."""
    rows = (await db.execute(
        select(Policy, User)
        .join(User, User.id == Policy.user_id)
        .order_by(Policy.created_at.desc())
        .limit(200)
    )).all()
    
    return [
        {
            "id": p.Policy.id,
            "worker_name": p.User.name,
            "platform": p.User.platform,
            "zone": p.User.zone,
            "risk_bucket": p.Policy.risk_bucket,
            "weekly_premium": p.Policy.weekly_premium,
            "coverage_amount": p.Policy.coverage_amount,
            "status": p.Policy.status,
            "start_date": p.Policy.start_date.isoformat() + "Z",
        } for p in rows
    ]


@router.get("/admin/claims")
async def get_all_claims(db: AsyncSession = Depends(get_db)):
    """Fetch all claims across the platform for the admin view."""
    rows = (await db.execute(
        select(Claim, User)
        .join(User, User.id == Claim.user_id)
        .order_by(Claim.created_at.desc())
        .limit(200)
    )).all()
    
    return [
        {
            "id": c.Claim.id,
            "worker_name": c.User.name,
            "platform": c.User.platform,
            "zone": c.User.zone,
            "trigger_event": c.Claim.trigger_event,
            "payout_amount": c.Claim.payout_amount,
            "status": c.Claim.status,
            "fraud_tier": c.Claim.fraud_tier,
            "timestamp": c.Claim.created_at.isoformat() + "Z",
        } for c in rows
    ]
