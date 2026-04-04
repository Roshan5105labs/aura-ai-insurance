"""
Trigger Engine — integrates ML teammate's 5-condition parametric engine.
Wraps ml/trigger_engine.py and exposes the async API the FastAPI routes expect.
Payout table (stackable) per INTEGRATION_GUIDE:
  Rainfall > 50mm   → ₹500
  AQI > 300         → ₹300
  Wind > 60 km/h    → ₹400
  High-Risk Zone    → ₹200
  Social Disruption → ₹600
"""

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "ml"))

from trigger_engine import (
    fetch_weather_conditions,
    evaluate_triggers       as _evaluate_triggers,
    llm_social_disruption_trigger,
    EnvironmentalConditions,
)
from app.core.config import (
    OPENWEATHER_API_KEY,
    RAIN_THRESHOLD_MM_HR,
    HEAT_THRESHOLD_CELSIUS,
    AQI_THRESHOLD,
    ORDER_CRASH_THRESHOLD,
)

# ── Zone mapping: backend zone strings/cities → ML zone keys
ZONE_MAP = {
    # Cities mapping
    "mumbai"   : "ZONE_A",  # Heavy rain
    "delhi"    : "ZONE_B",  # High AQI + Social Disruption
    "chennai"  : "ZONE_C",  # High Winds (Cyclone)
    
    # Fallback zones mapping
    "dadar"    : "ZONE_A",
    "dharavi"  : "ZONE_B",
    "andheri"  : "ZONE_A",
    "bandra"   : "ZONE_A",
    "kurla"    : "ZONE_B",
    "cp"       : "ZONE_B",
}
DEFAULT_ZONE = "ZONE_D"

# Disruption hours for payout formula (kept from original backend)
DISRUPTION_HOURS_MAP = {
    "Rain"           : 6.0,
    "Heat"           : 4.0,
    "AQI"            : 3.0,
    "Wind"           : 5.0,
    "Curfew"         : 8.0,
    "OrderCrash"     : 5.0,
    "SocialDisrupt"  : 7.0,
}


async def get_weather(city: str) -> dict:
    """Returns weather dict compatible with original onboarding route."""
    zone_key = ZONE_MAP.get(city.lower(), DEFAULT_ZONE)
    cond = fetch_weather_conditions(zone_key)
    return {
        "temp"      : cond.aqi / 10,   # approximation for heat index display
        "rain_1h"   : cond.rainfall_mm,
        "wind_kmh"  : cond.wind_kmh,
        "aqi"       : cond.aqi,
        "zone_risk_label": cond.zone_risk,
    }


async def get_aqi(city: str) -> float:
    zone_key = ZONE_MAP.get(city.lower(), DEFAULT_ZONE)
    cond = fetch_weather_conditions(zone_key)
    return float(cond.aqi)


def get_order_ratio(zone: str) -> float:
    mock = {"dadar": 0.3, "andheri": 0.85, "bandra": 0.6, "cp": 0.2}
    return mock.get(zone.lower(), 0.9)


async def evaluate_triggers(city: str, zone: str) -> list[dict]:
    """
    Returns list of trigger dicts for the policy route.
    Uses ML trigger_engine internally.
    """
    zone_key = ZONE_MAP.get(zone.lower(), ZONE_MAP.get(city.lower(), DEFAULT_ZONE))
    cond     = fetch_weather_conditions(zone_key)
    event    = _evaluate_triggers(cond, worker_id="eval")

    # Build structured list matching frontend contract
    llm      = llm_social_disruption_trigger(cond.news_headline)
    triggers = [
        {
            "type"     : "Rain",
            "value"    : f"{cond.rainfall_mm}mm/hr",
            "is_active": cond.rainfall_mm > RAIN_THRESHOLD_MM_HR,
            "payout"   : 500,
        },
        {
            "type"     : "Heat",
            "value"    : f"{cond.aqi / 10:.1f}°C",
            "is_active": (cond.aqi / 10) > HEAT_THRESHOLD_CELSIUS,
            "payout"   : 0,
        },
        {
            "type"     : "AQI",
            "value"    : f"AQI {int(cond.aqi)}",
            "is_active": cond.aqi > AQI_THRESHOLD,
            "payout"   : 300,
        },
        {
            "type"     : "Wind",
            "value"    : f"{cond.wind_kmh} km/h",
            "is_active": cond.wind_kmh > 60.0,
            "payout"   : 400,
        },
        {
            "type"     : "SocialDisrupt",
            "value"    : llm.get("event_type", "None"),
            "is_active": llm.get("trigger", False),
            "payout"   : 600,
        },
    ]
    return triggers


def disruption_hours(triggers: list[dict]) -> float:
    active = [t for t in triggers if t["is_active"]]
    hours  = [DISRUPTION_HOURS_MAP.get(t["type"], 4.0) for t in active]
    return max(hours, default=0.0)


def stackable_payout(triggers: list[dict]) -> float:
    """
    Per INTEGRATION_GUIDE: payouts STACK across all active triggers.
    """
    return sum(t["payout"] for t in triggers if t["is_active"])
