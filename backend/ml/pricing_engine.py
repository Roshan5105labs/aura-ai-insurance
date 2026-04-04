"""
=============================================================
Task 1: Tri-Factor Dynamic Premium Pricing Engine
=============================================================
Generates a 5,000-row synthetic dataset, trains a VotingClassifier
(XGBoost + RandomForest + LogisticRegression), and exports the
trained pipeline as a .pkl file for FastAPI integration.

Teammate Integration:
  - Load model : pipeline = joblib.load("premium_model.pkl")
  - Predict    : pipeline.predict(pd.DataFrame([payload]))
  - Input JSON : see SAMPLE_PAYLOAD at bottom of file
  - Output     : weekly premium tier label → mapped to INR amount
=============================================================
"""

import numpy as np
import pandas as pd
import joblib
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.ensemble import RandomForestClassifier, VotingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
from xgboost import XGBClassifier

# ── Reproducibility ──────────────────────────────────────────
np.random.seed(42)
N = 5000

# ─────────────────────────────────────────────────────────────
# 1. SYNTHETIC DATASET GENERATION
# ─────────────────────────────────────────────────────────────

def generate_dataset(n: int = N) -> pd.DataFrame:
    """
    Generates synthetic gig worker profiles with environmental risk factors.

    Features
    --------
    rainfall_mm     : Weekly rainfall in millimetres (0–200)
    aqi             : Air Quality Index (0–500)
    zone_risk       : Zone risk score (1=Low, 2=Medium, 3=High)
    hours_per_week  : Average working hours per week (10–84)
    vehicle_age_yrs : Age of delivery vehicle in years (0–15)
    past_claims     : Number of claims filed in the past year (0–5)
    gig_tenure_yrs  : Years active as a gig worker (0–10)

    Target
    ------
    premium_tier : 0=Low, 1=Medium, 2=High (weekly premium in INR)
    """

    rainfall      = np.random.exponential(scale=30, size=n).clip(0, 200)
    aqi           = np.random.normal(150, 60, n).clip(0, 500)
    zone_risk     = np.random.choice([1, 2, 3], n, p=[0.4, 0.35, 0.25])
    hours_pw      = np.random.uniform(10, 84, n)
    vehicle_age   = np.random.exponential(scale=4, size=n).clip(0, 15)
    past_claims   = np.random.poisson(0.8, n).clip(0, 5)
    gig_tenure    = np.random.uniform(0, 10, n)

    # ── Risk score drives the label (with noise for realism) ──
    risk_score = (
        (rainfall / 200) * 30
        + (aqi / 500) * 20
        + (zone_risk - 1) / 2 * 25
        + (vehicle_age / 15) * 10
        + (past_claims / 5) * 15
        - (gig_tenure / 10) * 5          # experience reduces risk
        + np.random.normal(0, 5, n)      # noise
    )

    # Map risk score → premium tier
    bins   = [float('-inf'), 25, 50, float('inf')]
    labels = [0, 1, 2]                   # Low, Medium, High
    premium_tier = pd.cut(risk_score, bins=bins, labels=labels).astype(int)

    df = pd.DataFrame({
        "rainfall_mm"    : rainfall.round(2),
        "aqi"            : aqi.round(2),
        "zone_risk"      : zone_risk,
        "hours_per_week" : hours_pw.round(1),
        "vehicle_age_yrs": vehicle_age.round(1),
        "past_claims"    : past_claims,
        "gig_tenure_yrs" : gig_tenure.round(1),
        "premium_tier"   : premium_tier,
    })
    return df


# ─────────────────────────────────────────────────────────────
# 2. MODEL TRAINING
# ─────────────────────────────────────────────────────────────

FEATURE_COLS = [
    "rainfall_mm", "aqi", "zone_risk",
    "hours_per_week", "vehicle_age_yrs",
    "past_claims", "gig_tenure_yrs",
]
TARGET_COL = "premium_tier"

# INR weekly premium amounts per tier (used by frontend / FastAPI)
PREMIUM_INR_MAP = {0: 150, 1: 350, 2: 650}
TIER_LABEL_MAP  = {0: "Low", 1: "Medium", 2: "High"}


def build_pipeline() -> Pipeline:
    """Constructs the VotingClassifier pipeline."""

    xgb = XGBClassifier(
        n_estimators=200,
        max_depth=5,
        learning_rate=0.05,
        use_label_encoder=False,
        eval_metric="mlogloss",
        random_state=42,
    )
    rf = RandomForestClassifier(
        n_estimators=200,
        max_depth=8,
        random_state=42,
    )
    lr = LogisticRegression(
        max_iter=1000,
        multi_class="multinomial",
        solver="lbfgs",
        random_state=42,
    )

    ensemble = VotingClassifier(
        estimators=[("xgb", xgb), ("rf", rf), ("lr", lr)],
        voting="soft",                   # probability-averaged voting
    )

    pipeline = Pipeline([
        ("scaler", StandardScaler()),    # LR + distance-based models need scaling
        ("model", ensemble),
    ])
    return pipeline


def train(df: pd.DataFrame):
    """Trains and evaluates the pipeline, returns fitted pipeline."""

    X = df[FEATURE_COLS]
    y = df[TARGET_COL]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    pipeline = build_pipeline()
    print("[INFO] Training VotingClassifier (XGB + RF + LR) ...")
    pipeline.fit(X_train, y_train)

    y_pred = pipeline.predict(X_test)
    print("\n[INFO] Classification Report:")
    print(classification_report(y_test, y_pred,
          target_names=["Low", "Medium", "High"]))

    return pipeline


# ─────────────────────────────────────────────────────────────
# 3. PREDICTION HELPER  (used by FastAPI endpoint)
# ─────────────────────────────────────────────────────────────

def predict_premium(pipeline, payload: dict) -> dict:
    """
    FastAPI /calculate-premium endpoint can call this directly.

    Parameters
    ----------
    pipeline : fitted sklearn Pipeline (loaded from .pkl)
    payload  : dict matching SAMPLE_PAYLOAD structure

    Returns
    -------
    dict with tier label and weekly premium in INR
    """
    df_input = pd.DataFrame([payload])[FEATURE_COLS]
    tier      = int(pipeline.predict(df_input)[0])
    proba     = pipeline.predict_proba(df_input)[0].tolist()

    return {
        "premium_tier"      : tier,
        "tier_label"        : TIER_LABEL_MAP[tier],
        "weekly_premium_inr": PREMIUM_INR_MAP[tier],
        "confidence"        : {
            "Low"   : round(proba[0], 4),
            "Medium": round(proba[1], 4),
            "High"  : round(proba[2], 4),
        },
    }


# ─────────────────────────────────────────────────────────────
# 4. MAIN — generate data, train, serialize
# ─────────────────────────────────────────────────────────────

# Sample payload your backend teammate should POST to /calculate-premium
SAMPLE_PAYLOAD = {
    "rainfall_mm"    : 75.5,   # mm of rain this week
    "aqi"            : 220.0,  # current Air Quality Index
    "zone_risk"      : 2,      # 1=Low | 2=Medium | 3=High
    "hours_per_week" : 52.0,   # worker's weekly hours
    "vehicle_age_yrs": 4.5,    # age of bike/vehicle
    "past_claims"    : 1,      # claims in last 12 months
    "gig_tenure_yrs" : 3.2,    # years as gig worker
}


if __name__ == "__main__":
    # Step 1 – Generate dataset
    print("[INFO] Generating 5,000-row synthetic dataset ...")
    df = generate_dataset(N)
    df.to_csv("gig_worker_dataset.csv", index=False)
    print(f"[INFO] Dataset saved → gig_worker_dataset.csv  ({df.shape})")
    print(df["premium_tier"].value_counts().sort_index()
            .rename({0: "Low", 1: "Medium", 2: "High"}).to_string())

    # Step 2 – Train
    fitted_pipeline = train(df)

    # Step 3 – Serialize
    MODEL_PATH = "premium_model.pkl"
    joblib.dump(fitted_pipeline, MODEL_PATH)
    print(f"\n[INFO] Model serialized → {MODEL_PATH}")

    # Step 4 – Quick smoke-test with sample payload
    result = predict_premium(fitted_pipeline, SAMPLE_PAYLOAD)
    print("\n[INFO] Sample prediction:")
    print(f"  Input  : {SAMPLE_PAYLOAD}")
    print(f"  Output : {result}")
    print("\n✅ Pricing engine ready. Hand off premium_model.pkl to your backend teammate.")
