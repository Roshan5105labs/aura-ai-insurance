"""
=============================================================
Task 2: Parametric Trigger Engine
=============================================================
Evaluates 3–5 real-world conditions and automatically triggers
insurance claims when thresholds are breached.

Trigger Conditions
------------------
  1. Rainfall > 50 mm      → Weather API polling
  2. AQI > 300             → Air Quality API polling
  3. Wind speed > 60 km/h  → Wind / Weather API polling
  4. Zone Risk = HIGH      → Internal risk-zone database check
  5. Social disruption NLP → LLM zero-shot text classifier
                             (strike, curfew, riot detection)

The LLM trigger uses a *mock* function that simulates sending
unstructured news text to an open-source LLM prompt and returns
a structured JSON response — ready to be replaced with a real
Ollama / HuggingFace / OpenAI call.
=============================================================
"""

import json
import random
import datetime
from dataclasses import dataclass, asdict
from typing import Optional


# ─────────────────────────────────────────────────────────────
# DATA STRUCTURES
# ─────────────────────────────────────────────────────────────

@dataclass
class EnvironmentalConditions:
    rainfall_mm   : float
    aqi           : float
    wind_kmh      : float
    zone_risk     : str      # "LOW" | "MEDIUM" | "HIGH"
    news_headline : str      # free-text news feed entry


@dataclass
class TriggerEvent:
    triggered        : bool
    trigger_reasons  : list[str]
    claim_type       : str           # "AUTO" | "MANUAL" | "NONE"
    payout_inr       : float
    timestamp        : str
    raw_conditions   : dict


# ─────────────────────────────────────────────────────────────
# TRIGGER CONDITIONS  (3–5 as required)
# ─────────────────────────────────────────────────────────────

RAINFALL_THRESHOLD_MM  = 50.0    # Condition 1
AQI_THRESHOLD          = 300.0   # Condition 2
WIND_THRESHOLD_KMH     = 60.0    # Condition 3
HIGH_ZONE_RISK_LABEL   = "HIGH"  # Condition 4
# Condition 5 → NLP / LLM trigger (see below)


# ─────────────────────────────────────────────────────────────
# WEATHER / ENVIRONMENT API MOCK
# (Replace with real requests.get() calls in production)
# ─────────────────────────────────────────────────────────────

def fetch_weather_conditions(worker_zone: str) -> EnvironmentalConditions:
    """
    Simulates polling an external Weather / AQI API.

    In production replace this with:
        resp = requests.get(WEATHER_API_URL, params={...})
        data = resp.json()
    """
    simulated = {
        "ZONE_A": EnvironmentalConditions(
            rainfall_mm=90.0, aqi=145.0, wind_kmh=35.0,
            zone_risk="MEDIUM",
            news_headline="Heavy rain lashes Mumbai suburbs, roads waterlogged"
        ),
        "ZONE_B": EnvironmentalConditions(
            rainfall_mm=15.0, aqi=450.0, wind_kmh=25.0,
            zone_risk="HIGH",
            news_headline="Sudden strike in Dadar halts traffic, delivery workers stranded"
        ),
        "ZONE_C": EnvironmentalConditions(
            rainfall_mm=88.0, aqi=210.0, wind_kmh=85.0,
            zone_risk="HIGH",
            news_headline="Cyclone warning: strong winds expected across coastal areas"
        ),
        "ZONE_D": EnvironmentalConditions(
            rainfall_mm=5.0, aqi=90.0, wind_kmh=15.0,
            zone_risk="LOW",
            news_headline="Clear skies across the city, normal traffic conditions"
        ),
    }
    return simulated.get(worker_zone, simulated["ZONE_D"])


# ─────────────────────────────────────────────────────────────
# CONDITION 5: LLM SOCIAL DISRUPTION TRIGGER (MOCK)
# ─────────────────────────────────────────────────────────────

# Keywords an LLM would detect in a zero-shot classification prompt
DISRUPTION_KEYWORDS = [
    "strike", "curfew", "riot", "protest", "bandh", "shutdown",
    "blockade", "clashes", "unrest", "emergency", "evacuation",
]

def llm_social_disruption_trigger(news_text: str) -> dict:
    """
    Simulates passing unstructured news text to an LLM for zero-shot
    social disruption classification.

    PRODUCTION REPLACEMENT:
    -----------------------
    Replace the body below with a real LLM call, for example:

        # Ollama (local open-source LLM):
        import requests
        response = requests.post("http://localhost:11434/api/generate", json={
            "model": "mistral",
            "prompt": f\"\"\"
                You are an insurance claim trigger system.
                Analyze this news headline and determine if it describes
                a social disruption event (strike, curfew, riot, protest, bandh)
                that would prevent gig delivery workers from operating.

                Headline: "{news_text}"

                Respond ONLY with valid JSON in this exact format:
                {{"trigger": true/false, "event_type": "string", "confidence": 0.0-1.0, "reasoning": "string"}}
            \"\"\",
            "stream": False
        })
        return json.loads(response.json()["response"])

        # HuggingFace / OpenAI calls follow a similar pattern.

    Mock logic below mirrors what the LLM would return:
    """
    news_lower    = news_text.lower()
    matched_kw    = [kw for kw in DISRUPTION_KEYWORDS if kw in news_lower]
    is_disruption = len(matched_kw) > 0

    # Simulate LLM-style structured JSON response
    if is_disruption:
        return {
            "trigger"   : True,
            "event_type": matched_kw[0].capitalize(),
            "confidence": round(random.uniform(0.78, 0.97), 2),
            "reasoning" : (
                f"Headline contains disruption indicator(s): {matched_kw}. "
                "Gig worker operations likely impacted."
            ),
        }
    else:
        return {
            "trigger"   : False,
            "event_type": "None",
            "confidence": round(random.uniform(0.85, 0.99), 2),
            "reasoning" : "No social disruption indicators detected in the headline.",
        }


# ─────────────────────────────────────────────────────────────
# CORE TRIGGER EVALUATION ENGINE
# ─────────────────────────────────────────────────────────────

def evaluate_triggers(conditions: EnvironmentalConditions,
                      worker_id: str) -> TriggerEvent:
    """
    Evaluates all 5 parametric conditions and decides whether to
    auto-trigger a claim.

    Parameters
    ----------
    conditions : EnvironmentalConditions — current env snapshot
    worker_id  : str — unique gig worker identifier

    Returns
    -------
    TriggerEvent — structured trigger decision with payout info
    """
    triggered_reasons = []
    payout_inr        = 0.0

    # ── Condition 1: Rainfall ────────────────────────────────
    if conditions.rainfall_mm > RAINFALL_THRESHOLD_MM:
        triggered_reasons.append(
            f"RAINFALL: {conditions.rainfall_mm}mm > {RAINFALL_THRESHOLD_MM}mm threshold"
        )
        payout_inr += 500.0   # base weather payout

    # ── Condition 2: Air Quality ─────────────────────────────
    if conditions.aqi > AQI_THRESHOLD:
        triggered_reasons.append(
            f"AQI: {conditions.aqi} > {AQI_THRESHOLD} (hazardous air)"
        )
        payout_inr += 300.0

    # ── Condition 3: Wind Speed ──────────────────────────────
    if conditions.wind_kmh > WIND_THRESHOLD_KMH:
        triggered_reasons.append(
            f"WIND: {conditions.wind_kmh} km/h > {WIND_THRESHOLD_KMH} km/h threshold"
        )
        payout_inr += 400.0

    # ── Condition 4: High-Risk Zone ──────────────────────────
    if conditions.zone_risk == HIGH_ZONE_RISK_LABEL:
        triggered_reasons.append(
            f"ZONE_RISK: Worker in '{conditions.zone_risk}' risk zone"
        )
        payout_inr += 200.0   # zone surcharge

    # ── Condition 5: LLM Social Disruption Check ─────────────
    llm_result = llm_social_disruption_trigger(conditions.news_headline)
    if llm_result["trigger"]:
        triggered_reasons.append(
            f"SOCIAL_DISRUPTION [{llm_result['event_type']}]: "
            f"'{conditions.news_headline}' "
            f"(LLM confidence: {llm_result['confidence']})"
        )
        payout_inr += 600.0   # social disruption has highest payout

    # ── Build TriggerEvent ───────────────────────────────────
    is_triggered = len(triggered_reasons) > 0
    return TriggerEvent(
        triggered       = is_triggered,
        trigger_reasons = triggered_reasons,
        claim_type      = "AUTO" if is_triggered else "NONE",
        payout_inr      = payout_inr,
        timestamp       = datetime.datetime.utcnow().isoformat() + "Z",
        raw_conditions  = asdict(conditions),
    )


# ─────────────────────────────────────────────────────────────
# CLAIM DISPATCHER  (stub → wire to your FastAPI + DB)
# ─────────────────────────────────────────────────────────────

def dispatch_claim(worker_id: str, event: TriggerEvent) -> dict:
    """
    Stub that simulates posting the trigger event to your backend.

    In production replace with:
        requests.post(f"{BACKEND_URL}/claims/auto-trigger", json=payload)
    """
    payload = {
        "worker_id"  : worker_id,
        "event"      : asdict(event),
    }
    # Simulate HTTP 201 Created response
    return {"status": "CLAIM_CREATED", "claim_id": f"CLM-{random.randint(10000,99999)}", **payload}


# ─────────────────────────────────────────────────────────────
# POLLING LOOP  (runs once per cycle; schedule with APScheduler)
# ─────────────────────────────────────────────────────────────

def run_trigger_cycle(worker_registry: dict):
    """
    Main polling cycle. Call this on a schedule (e.g., every hour).

    worker_registry : {worker_id: zone_id}
    """
    print(f"\n{'='*60}")
    print(f"  TRIGGER ENGINE — Cycle at {datetime.datetime.utcnow().isoformat()}Z")
    print(f"{'='*60}")

    for worker_id, zone in worker_registry.items():
        print(f"\n[Worker: {worker_id} | Zone: {zone}]")

        # 1. Poll external APIs for current conditions
        conditions = fetch_weather_conditions(zone)

        # 2. Evaluate all 5 trigger conditions
        event = evaluate_triggers(conditions, worker_id)

        # 3. Dispatch claim if triggered
        if event.triggered:
            response = dispatch_claim(worker_id, event)
            print(f"  🔴 TRIGGERED  → Claim ID: {response['claim_id']}")
            print(f"     Payout     : ₹{event.payout_inr:.2f}")
            for reason in event.trigger_reasons:
                print(f"     ↳ {reason}")
        else:
            print(f"  🟢 No triggers fired. All conditions within safe limits.")

        # 4. Return structured JSON (FastAPI can return this directly)
        output_json = json.dumps(asdict(event), indent=2)
        print(f"\n  JSON Payload:\n{output_json}")


# ─────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    # Simulate 4 workers in different zones
    WORKER_REGISTRY = {
        "WRK-001": "ZONE_A",   # Heavy rain zone
        "WRK-002": "ZONE_B",   # Strike + high AQI zone
        "WRK-003": "ZONE_C",   # Cyclone zone
        "WRK-004": "ZONE_D",   # All clear zone
    }

    run_trigger_cycle(WORKER_REGISTRY)

    print("\n\n" + "="*60)
    print("  STANDALONE LLM TRIGGER DEMO")
    print("="*60)
    test_headlines = [
        "Sudden strike in Dadar halts traffic, delivery workers stranded",
        "City-wide curfew imposed after communal clashes in north district",
        "Weekend food festival brings crowds to Bandra waterfront",
    ]
    for headline in test_headlines:
        result = llm_social_disruption_trigger(headline)
        print(f"\n  Headline : \"{headline}\"")
        print(f"  LLM JSON : {json.dumps(result, indent=4)}")

    print("\n✅ Trigger engine complete. Integrate run_trigger_cycle() into your FastAPI scheduler.")
