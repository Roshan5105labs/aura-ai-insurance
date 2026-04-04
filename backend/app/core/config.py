import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL        = os.getenv("DATABASE_URL", "postgresql+asyncpg://aura_user:aura_pass@localhost:5432/aura_db")
OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY", "mock_key")
RAZORPAY_KEY_ID     = os.getenv("RAZORPAY_KEY_ID",     "rzp_test_mock")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET",  "mock_secret")

# Trigger thresholds (original backend + ML guide)
RAIN_THRESHOLD_MM_HR    = 50.0
HEAT_THRESHOLD_CELSIUS  = 40.0
AQI_THRESHOLD           = 300
WIND_THRESHOLD_KMH      = 60.0
ORDER_CRASH_THRESHOLD   = 0.4
COVERAGE_FACTOR         = 0.8

# Kept for legacy helpers
PREMIUM_MAP  = {"Low": 150,  "Medium": 350,  "High": 650}
COVERAGE_MAP = {"Low": 500,  "Medium": 1000, "High": 1500}
