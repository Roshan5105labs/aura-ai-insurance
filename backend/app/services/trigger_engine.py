"""
Trigger engine for Aura.

Keeps the 5-condition parametric model and adds hyperlocal zone profiles for
Indian operating areas so Soar demos can show area-aware claim decisions.
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "ml"))

from trigger_engine import fetch_weather_conditions, llm_social_disruption_trigger

from app.core.config import AQI_THRESHOLD, HEAT_THRESHOLD_CELSIUS, RAIN_THRESHOLD_MM_HR


ZONE_PROFILES = {
    "mumbai": {"zone_key": "ZONE_A", "micro_zone": "mumbai-core", "zone_risk": "MEDIUM", "rain_multiplier": 1.0},
    "dadar": {"zone_key": "ZONE_A", "micro_zone": "mumbai-dadar-west", "zone_risk": "MEDIUM", "rain_multiplier": 1.15},
    "andheri": {"zone_key": "ZONE_A", "micro_zone": "mumbai-andheri-east", "zone_risk": "MEDIUM", "rain_multiplier": 0.9},
    "bandra": {"zone_key": "ZONE_A", "micro_zone": "mumbai-bandra-west", "zone_risk": "LOW", "rain_multiplier": 0.85},
    "delhi": {"zone_key": "ZONE_B", "micro_zone": "delhi-central", "zone_risk": "HIGH", "rain_multiplier": 0.7},
    "cp": {"zone_key": "ZONE_B", "micro_zone": "delhi-connaught-place", "zone_risk": "HIGH", "rain_multiplier": 0.65},
    "dharavi": {"zone_key": "ZONE_B", "micro_zone": "mumbai-dharavi-cluster", "zone_risk": "HIGH", "rain_multiplier": 0.95},
    "kurla": {"zone_key": "ZONE_B", "micro_zone": "mumbai-kurla-east", "zone_risk": "HIGH", "rain_multiplier": 0.92},
    "chennai": {"zone_key": "ZONE_C", "micro_zone": "chennai-coastal", "zone_risk": "HIGH", "rain_multiplier": 1.05},
}
DEFAULT_PROFILE = {
    "zone_key": "ZONE_D",
    "micro_zone": "india-default",
    "zone_risk": "LOW",
    "rain_multiplier": 1.0,
}

DISRUPTION_HOURS_MAP = {
    "Rain": 6.0,
    "Heat": 4.0,
    "AQI": 3.0,
    "Wind": 5.0,
    "ZoneRisk": 4.0,
    "SocialDisrupt": 7.0,
}


def resolve_zone_profile(city: str, zone: str) -> dict:
    zone_key = (zone or "").strip().lower()
    city_key = (city or "").strip().lower()
    if zone_key in ZONE_PROFILES:
        return ZONE_PROFILES[zone_key]
    if city_key in ZONE_PROFILES:
        return ZONE_PROFILES[city_key]

    profile = DEFAULT_PROFILE.copy()
    profile["micro_zone"] = f"{city_key or 'india'}-{zone_key or 'default'}"
    return profile


async def get_weather(city: str) -> dict:
    profile = resolve_zone_profile(city, city)
    cond = fetch_weather_conditions(profile["zone_key"])
    rainfall = round(cond.rainfall_mm * profile["rain_multiplier"], 1)
    return {
        "temp": cond.aqi / 10,
        "rain_1h": rainfall,
        "wind_kmh": cond.wind_kmh,
        "aqi": cond.aqi,
        "zone_risk_label": profile["zone_risk"],
        "micro_zone": profile["micro_zone"],
    }


async def get_aqi(city: str) -> float:
    profile = resolve_zone_profile(city, city)
    cond = fetch_weather_conditions(profile["zone_key"])
    return float(cond.aqi)


def get_order_ratio(zone: str) -> float:
    mock = {"dadar": 0.3, "andheri": 0.85, "bandra": 0.6, "cp": 0.2, "kurla": 0.45}
    return mock.get(zone.lower(), 0.9)


async def evaluate_triggers(city: str, zone: str) -> list[dict]:
    profile = resolve_zone_profile(city, zone)
    cond = fetch_weather_conditions(profile["zone_key"])
    rainfall = round(cond.rainfall_mm * profile["rain_multiplier"], 1)
    social_event = llm_social_disruption_trigger(cond.news_headline)

    return [
        {
            "type": "Rain",
            "value": f"{rainfall}mm/hr",
            "is_active": rainfall > RAIN_THRESHOLD_MM_HR,
            "payout": 500,
            "micro_zone": profile["micro_zone"],
        },
        {
            "type": "Heat",
            "value": f"{cond.aqi / 10:.1f}C",
            "is_active": (cond.aqi / 10) > HEAT_THRESHOLD_CELSIUS,
            "payout": 0,
            "micro_zone": profile["micro_zone"],
        },
        {
            "type": "AQI",
            "value": f"AQI {int(cond.aqi)}",
            "is_active": cond.aqi > AQI_THRESHOLD,
            "payout": 300,
            "micro_zone": profile["micro_zone"],
        },
        {
            "type": "Wind",
            "value": f"{cond.wind_kmh} km/h",
            "is_active": cond.wind_kmh > 60.0,
            "payout": 400,
            "micro_zone": profile["micro_zone"],
        },
        {
            "type": "ZoneRisk",
            "value": profile["zone_risk"],
            "is_active": profile["zone_risk"] == "HIGH",
            "payout": 200,
            "micro_zone": profile["micro_zone"],
        },
        {
            "type": "SocialDisrupt",
            "value": social_event.get("event_type", "None"),
            "is_active": social_event.get("trigger", False),
            "payout": 600,
            "micro_zone": profile["micro_zone"],
        },
    ]


def disruption_hours(triggers: list[dict]) -> float:
    active = [t for t in triggers if t["is_active"]]
    hours = [DISRUPTION_HOURS_MAP.get(t["type"], 4.0) for t in active]
    return max(hours, default=0.0)


def stackable_payout(triggers: list[dict]) -> float:
    return sum(t["payout"] for t in triggers if t["is_active"])


def build_event_key(city: str, zone: str, triggers: list[dict]) -> str:
    active_types = sorted(t["type"] for t in triggers if t["is_active"])
    profile = resolve_zone_profile(city, zone)
    signature = "-".join(active_types) if active_types else "clear"
    return f"{profile['micro_zone']}::{signature}"
