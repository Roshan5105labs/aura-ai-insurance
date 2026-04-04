from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta
import uuid
import hashlib
import os

def get_password_hash(password: str) -> str:
    salt = os.urandom(16)
    pwd_hash = hashlib.pbkdf2_hmac('sha256', password.encode(), salt, 100000)
    return salt.hex() + ":" + pwd_hash.hex()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    if not hashed_password:
        return False
    try:
        salt_hex, hash_hex = hashed_password.split(':')
        salt = bytes.fromhex(salt_hex)
        pwd_hash = hashlib.pbkdf2_hmac('sha256', plain_password.encode(), salt, 100000)
        return pwd_hash.hex() == hash_hex
    except Exception:
        return False

from app.db.database import get_db
from app.models.user import User
from app.models.policy import Policy
from app.schemas.user import OnboardRequest, OnboardResponse, LoginRequest
from fastapi import HTTPException
from app.services.risk_engine import compute_risk_score
from app.services.trigger_engine import get_weather, get_aqi, get_order_ratio

router = APIRouter()

# Zone risk int mapping for ML model (1=Low, 2=Medium, 3=High)
ZONE_RISK_INT = {
    "dadar": 2, "dharavi": 3, "kurla": 2,
    "andheri": 2, "bandra": 1, "cp": 2,
}

@router.post("/onboard", response_model=OnboardResponse)
async def onboard(payload: OnboardRequest, db: AsyncSession = Depends(get_db)):
    # Fetch live weather/AQI for rainfall + AQI features
    w          = await get_weather(payload.city)
    aqi        = await get_aqi(payload.city)
    zone_risk_int = ZONE_RISK_INT.get(payload.zone.lower(), 2)

    # ── ML Risk Engine ───────────────────────────────────────
    ml_result = compute_risk_score(
        rainfall_mm     = w["rain_1h"],
        aqi             = aqi,
        zone_risk       = zone_risk_int,
        hours_per_week  = payload.hours_per_week,
        vehicle_age_yrs = payload.vehicle_age_yrs,
        past_claims     = payload.past_claims,
        gig_tenure_yrs  = payload.gig_tenure_yrs,
    )

    # ── Persist User ─────────────────────────────────────────
    user = User(
        id                 = str(uuid.uuid4()),
        name               = payload.name,
        hashed_password    = get_password_hash(payload.password),
        platform           = payload.platform,
        zone               = payload.zone,
        city               = payload.city,
        avg_daily_earnings = payload.avg_daily_earnings,
        risk_score         = ml_result["risk_score"],
        risk_bucket        = ml_result["risk_bucket"],
        hours_per_week     = payload.hours_per_week,
        vehicle_age_yrs    = payload.vehicle_age_yrs,
        past_claims        = payload.past_claims,
        gig_tenure_yrs     = payload.gig_tenure_yrs,
    )
    db.add(user)
    await db.flush()

    # ── Persist Policy (7-day, income loss only) ─────────────
    now    = datetime.utcnow()
    policy = Policy(
        id                    = str(uuid.uuid4()),
        user_id               = user.id,
        status                = "Active",
        weekly_premium        = ml_result["weekly_premium"],
        coverage_amount       = ml_result["coverage_amount"],
        risk_bucket           = ml_result["risk_bucket"],
        start_date            = now,
        expiry_date           = now + timedelta(days=7),
        covers_income_loss_only = True,
    )
    db.add(policy)
    await db.commit()

    return OnboardResponse(
        user_id         = user.id,
        risk_score      = ml_result["risk_score"],
        risk_bucket     = ml_result["risk_bucket"],
        weekly_premium  = ml_result["weekly_premium"],
        coverage_amount = ml_result["coverage_amount"],
        confidence      = ml_result["confidence"],
    )

@router.post("/login", response_model=OnboardResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = (await db.execute(select(User).where(User.name.ilike(payload.name)))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Rider not found. Please register first.")
    
    if not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect password.")
        
    policy = (await db.execute(
        select(Policy)
        .where(Policy.user_id == user.id, Policy.status == "Active")
        .order_by(Policy.created_at.desc())
    )).scalar_one_or_none()
    
    if not policy:
        raise HTTPException(status_code=400, detail="No active policy found for this rider.")
        
    return OnboardResponse(
        user_id         = user.id,
        risk_score      = user.risk_score,
        risk_bucket     = user.risk_bucket,
        weekly_premium  = policy.weekly_premium,
        coverage_amount = policy.coverage_amount,
        confidence      = None,
    )
