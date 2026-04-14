import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL        = os.getenv("DATABASE_URL", "postgresql+asyncpg://aura_user:aura_pass@localhost:5432/aura_db")
OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY", "mock_key")
RAZORPAY_KEY_ID     = os.getenv("RAZORPAY_KEY_ID",     "rzp_test_mock")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET",  "mock_secret")
RAZORPAY_ACCOUNT_NUMBER = os.getenv("RAZORPAY_ACCOUNT_NUMBER", "mock_account")
RAZORPAY_WEBHOOK_SECRET = os.getenv("RAZORPAY_WEBHOOK_SECRET", "mock_webhook_secret")
WHATSAPP_PROVIDER       = os.getenv("WHATSAPP_PROVIDER", "mock")
WHATSAPP_FROM           = os.getenv("WHATSAPP_FROM", "Aura")
DEFAULT_COUNTRY_CODE    = os.getenv("DEFAULT_COUNTRY_CODE", "+91")

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
