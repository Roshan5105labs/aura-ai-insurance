import base64
import logging
import uuid
from datetime import datetime

import httpx

from app.core.config import (
    RAZORPAY_ACCOUNT_NUMBER,
    RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET,
)

logger = logging.getLogger(__name__)


def _is_mock_mode() -> bool:
    return (
        "mock" in RAZORPAY_KEY_ID.lower()
        or "mock" in RAZORPAY_KEY_SECRET.lower()
        or "mock" in RAZORPAY_ACCOUNT_NUMBER.lower()
    )


async def initiate_payout(claim_id: str, amount_inr: float) -> dict:
    ref = f"pout_{uuid.uuid4().hex[:12]}"
    paid_at = datetime.utcnow().isoformat() + "Z"

    if _is_mock_mode():
        logger.info("[Aura][MOCK UPI] Rs.%s -> claim %s | ref %s", amount_inr, claim_id[:8], ref)
        return {
            "payout_ref": ref,
            "status": "Processed",
            "provider": "Razorpay Test Mode",
            "method": "UPI",
            "paid_at": paid_at,
            "is_live": False,
        }

    auth_token = base64.b64encode(f"{RAZORPAY_KEY_ID}:{RAZORPAY_KEY_SECRET}".encode()).decode()
    payload = {
        "account_number": RAZORPAY_ACCOUNT_NUMBER,
        "amount": int(round(amount_inr * 100)),
        "currency": "INR",
        "mode": "UPI",
        "purpose": "payout",
        "reference_id": claim_id,
        "narration": "Aura parametric claim payout",
        "fund_account": {
            "account_type": "vpa",
            "vpa": {"address": "success@razorpay"},
            "contact": {
                "name": "Aura Worker",
                "email": "worker@aura.demo",
                "contact": "9999999999",
                "type": "employee",
            },
        },
    }

    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            response = await client.post(
                "https://api.razorpay.com/v1/payouts",
                headers={
                    "Authorization": f"Basic {auth_token}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
        response.raise_for_status()
        data = response.json()
        provider_status = str(data.get("status", "processed")).strip().title()
        return {
            "payout_ref": data.get("id", ref),
            "status": provider_status if provider_status else "Processing",
            "provider": "Razorpay",
            "method": "UPI",
            "paid_at": paid_at if provider_status == "Processed" else None,
            "is_live": True,
        }
    except Exception as exc:
        logger.warning("[Aura][Razorpay fallback] claim=%s err=%s", claim_id[:8], exc)
        return {
            "payout_ref": ref,
            "status": "Processing",
            "provider": "Razorpay Test Mode",
            "method": "UPI",
            "paid_at": None,
            "is_live": False,
            "error": str(exc),
        }
