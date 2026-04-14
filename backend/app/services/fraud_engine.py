"""
Fraud engine for Aura claim telemetry.

Uses an IsolationForest trained on synthetic normal gig-worker movement
patterns so the claim route can produce a real anomaly score, tier, and
human-readable reasons for manual review.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import List

import numpy as np
from sklearn.ensemble import IsolationForest


FEATURES = [
    "avg_speed_kmph",
    "max_speed_kmph",
    "tower_changes_per_hour",
    "spatial_claim_density",
    "platform_pings",
]


def _build_reference_model() -> IsolationForest:
    rng = np.random.default_rng(42)
    samples = np.column_stack(
        [
            rng.normal(26, 5, 900).clip(8, 55),
            rng.normal(44, 10, 900).clip(18, 90),
            rng.normal(3.2, 1.1, 900).clip(0, 8),
            rng.normal(2.5, 1.7, 900).clip(0, 10),
            rng.normal(14, 4, 900).clip(2, 28),
        ]
    )
    model = IsolationForest(
        n_estimators=200,
        contamination=0.08,
        random_state=42,
    )
    model.fit(samples)
    return model


_MODEL = _build_reference_model()


@dataclass
class FraudAssessment:
    score: float
    tier: int
    reasons: List[str]


def assess_claim_telemetry(
    avg_speed_kmph: float,
    max_speed_kmph: float,
    tower_changes_per_hour: float,
    spatial_claim_density: int,
    platform_pings: int,
) -> FraudAssessment:
    row = np.array(
        [[
            avg_speed_kmph,
            max_speed_kmph,
            tower_changes_per_hour,
            spatial_claim_density,
            platform_pings,
        ]]
    )
    anomaly_score = float(_MODEL.decision_function(row)[0])

    reasons: List[str] = []
    if max_speed_kmph > 95:
        reasons.append("Unrealistic peak speed for a city delivery route")
    if tower_changes_per_hour < 1:
        reasons.append("Very low telecom movement across the claim window")
    if spatial_claim_density >= 12:
        reasons.append("High same-zone claim density suggests coordinated activity")
    if platform_pings <= 2:
        reasons.append("Too few platform pings during the reported disruption")
    if avg_speed_kmph < 5 and max_speed_kmph > 60:
        reasons.append("Stop-start movement pattern is inconsistent")

    if anomaly_score <= -0.08 or len(reasons) >= 3:
        tier = 3
    elif anomaly_score <= 0.02 or reasons:
        tier = 2
    else:
        tier = 1

    if not reasons and tier == 1:
        reasons.append("Telemetry aligns with normal delivery movement in Indian urban zones")

    return FraudAssessment(
        score=round(anomaly_score, 4),
        tier=tier,
        reasons=reasons,
    )
