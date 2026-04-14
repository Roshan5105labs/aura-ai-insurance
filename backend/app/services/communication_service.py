"""
India-first worker communication helpers.

For Soar, Aura uses WhatsApp-style templates as the primary worker channel,
with SMS fallback semantics kept in the payload for future delivery providers.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from app.core.config import WHATSAPP_FROM, WHATSAPP_PROVIDER


def build_claim_notification(
    worker_name: str,
    trigger_event: str,
    payout_amount: float,
    status: str,
    city: str,
    zone: str,
    reasons: list[str] | None = None,
) -> dict[str, Any]:
    if status == "Paid":
        body = (
            f"Aura update: {trigger_event} in {zone}, {city}. "
            f"Claim approved and payout of Rs.{payout_amount:.0f} is being sent."
        )
    elif status == "Processing":
        body = (
            f"Aura update: {trigger_event} detected in {zone}, {city}. "
            f"Claim approved and payout is processing."
        )
    else:
        extra = f" Reason: {reasons[0]}." if reasons else ""
        body = (
            f"Aura update: your claim is under review for {trigger_event} in {zone}, {city}."
            f"{extra}"
        )

    return {
        "channel": "WhatsApp",
        "provider": WHATSAPP_PROVIDER,
        "from": WHATSAPP_FROM,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "title": "Aura worker alert",
        "body": body,
        "delivery_status": "Queued",
    }


def build_policy_notification(
    worker_name: str,
    weekly_premium: int,
    expiry_date: datetime,
) -> dict[str, Any]:
    return {
        "channel": "WhatsApp",
        "provider": WHATSAPP_PROVIDER,
        "from": WHATSAPP_FROM,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "title": "Aura renewal reminder",
        "body": (
            f"Aura reminder for {worker_name}: your weekly policy renews at Rs.{weekly_premium}. "
            f"Coverage remains active until {expiry_date.strftime('%d %b %Y')}."
        ),
        "delivery_status": "Queued",
    }
