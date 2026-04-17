**Aura: AI-Powered Parametric Insurance for India's Gig Economy**
Guidewire DevTrails 2026 Hackathon Entry

Built as a Guidewire-inspired extension for PolicyCenter/ClaimCenter, automating parametric triggers for gig economy risks.

Critical Constraints Compliance

Explicit Exclusion: Coverage strictly limited to loss of income only from external disruptions. No coverage for health conditions, life insurance, personal accidents, or vehicle repairs per hackathon guidelines.

Problem Statement

Platform delivery partners (Swiggy) in India lose daily income from external disruptions like heavy rain, extreme heat, pollution spikes, curfews, or market downturns. No affordable, automated insurance exists to compensate these losses—manual claims are slow and fraud-prone.

Objectives

An AI-driven parametric insurance platform that:

1) Auto-detects disruptions via APIs (weather, orders, curfews)
2) Dynamically calculates weekly premiums
3) Triggers claims automatically (zero paperwork)
4) Prevents GPS spoofing and coordinated fraud rings

Delivers instant UPI payouts

Target Users: Swiggy delivery partners in high-risk cities (Mumbai, Delhi, Chennai)

Persona-Based Scenario: Vikram's Workflow

Vikram, 28, Swiggy Rider in Mumbai Dadar (₹800/day avg)

Profile: Dedicated rider serving tight 2km hyper-local delivery radius in Dadar. 25-30 orders/day, 10am-10pm shifts, completely reliant on uninterrupted local operations.
Onboarding: Enters name, Swiggy, Dadar zone, ₹800 earnings. Gets MEDIUM risk (₹40/week). UPI payment -> Policy active 7 days.
Monsoon Day 3: OpenWeather detects 52mm/hr Dadar rain -> Severe flooding halts local operations. Vikram's GPS confirms 2km zone. Claim auto-created.
Fraud Check: Normal 28kmph trajectory, 3 tower handoffs, weather match -> Tier 1 instant approval.
Payout: ₹384 (₹800 × 6hrs × 0.8) credited SAME DAY to UPI.
Vikram sees: "Rain claim PAID ₹384. Local operations halted. Next premium due: Mar 27."

System Architecture

[User App] --> [Onboarding] --> [AI Risk Engine] --> [Premium Calc] --> [Policy Active]
                     |                |                       |
                [Parametric Triggers] --> [Claims Automation] --> [Fraud Check] --> [Payout]
                     |                                                 |
                [Weather/Orders APIs]                          [Analytics Dashboard]

Core Modules:

1) User Onboarding & Risk Profiling
2) Weekly Premium Calculator
3) Parametric Trigger Engine (5 triggers)
4) Claims Automation + Fraud Defense
5) Razorpay Instant Payouts
6) Worker/Admin Dashboards

Step-by-Step Implementation

1. User Onboarding

Collect: Name, platform, city/zone, avg daily earnings
Capture: GPS trajectory, mocked delivery logs
Store: PostgreSQL with behavioral baseline

2. AI Risk Profiling

Model: XGBoost Classifier (weather + location + order trends)
Features: 7-day rain avg, AQI, flood zone, order velocity
Output: Risk Score (0-1) -> Low/Medium/High buckets

3. Weekly Premium Calculation

Dynamic formula: 
Premium = f(Risk, Forecast, Orders)

Risk Level	Premium	Coverage
Low	₹20	₹500
Medium	₹40	₹1,000
High	₹60	₹1,500

4. Parametric Triggers (5 Types)

Trigger	     Condition	    Data Source

Rain	      >50mm/hr	    OpenWeather
Heat	      >40°C	    OpenWeather
Curfew	    Zone alert	     Mock API

5. Claims & Payout Formula

Payout = Avg Daily Earnings × Trigger Hours × Coverage Factor
Example: ₹800/day × 6hr rain × 0.8 = ₹384 instant payout

AI/ML Components
Risk Prediction: XGBoost
Classifies risk using [rainfall, AQI, flood_zone, order_trend] 

Dynamic Pricing: Linear Regression
Weekly refit: premium ~ risk_score + forecast_rain + zone_risk

Fraud Detection: Isolation Forest
Unsupervised anomaly detection on trajectories 

Adversarial Defense & Anti-Spoofing Strategy
Threat Model: 500-worker syndicate using GPS-spoofing apps (FakeGPS) via Telegram groups to fake red-alert entrapment from home bases, draining liquidity pools.

1. Differentiation Logic: Real vs Spoofed

Physics + Behavior > Coordinates
Spoofers fail at scale coordination.

Real Worker	                            Spoofed Actor

20-40kmph trajectory bursts	        250kmph jumps/static points
Tower handoffs every 2-5km	           Same tower 24/7
Claims spread across city	        500 claims in 2km radius

AI Verdict: Isolation Forest anomaly score < -0.3 = Fraud 

2. Data Points Beyond GPS

- Trajectory Physics: Speed profile, jump detection (>100m/sec)
- Telecom Signals: Tower changes, signal drops match movement
- Platform Activity: No delivery pings during "stranded" claims
- External Validation: Weather station vs claimed zone
- Network Effects: Spatial claim clustering (500 in 2km = syndicate)

Syndicate Buster: KMeans clustering flags abnormal claim density.

3. UX Balance for Honest Workers

Claim Workflow:
Tier 1: Auto-Approve (95%) - Isolation Forest Score > -0.1
Tier 2: "Under Review" (3min) - Isolation Forest Score = -0.1 to -0.3
Tier 3: Manual (<1%) - Isolation Forest Score < -0.3 - Provisional 50% payout, full refund if cleared

Grace Periods:
- Network drops: 15min buffer
- No blacklisting: Honest flags auto-clear next day

Tech Stack & APIs
APIs:

OpenWeatherMap (real-time rain/temp)
Google Maps (trajectory validation)
Razorpay Test Mode (UPI payouts)

Architecture:

- Backend: FastAPI (Python 3.10+)
- Frontend: React + Tailwind
- Database: PostgreSQL (Docker)
- ML: Scikit-learn, XGBoost
- Deploy: Heroku 
- Dual Dashboards

Platform Choice Justification:

Web (React + FastAPI) chosen over Mobile:

1) 10x faster prototyping (hot reload vs app store)
2) PWA = native features (offline, notifications, GPS)
3) 100% device coverage (works on any phone instantly)
4) Clear migration to React Native Phase 2
5) Modern GPS API matches native accuracy

Worker Dashboard:

1) Active policy + risk score
2) Claims history + earnings protected
3) Real-time trigger alerts

Admin Dashboard:

1) Syndicate alerts (spatial heatmaps)
2) Fraud analytics (block rate: 97%)
3) Payout velocity + liquidity pool

Setup Instructions

bash
git clone https://github.com/Roshan5105labs/aura-ai-insurance
cd gig-insure
pip install -r requirements.txt
docker-compose up


Key Innovations

1) Zero-touch parametric claims (Guidewire-native triggers)
2) Syndicate-proof fraud defense (multi-signal + clustering)
3) Gig-first weekly model (₹20 entry point)
4) India-specific triggers (AQI, curfews, order crashes)

Future Work

1) Guidewire PolicyCenter/ClaimCenter plugins
2) Real Swiggy order APIs
3) Video verification (helmet cam analysis)
4) Blockchain payout audit trails

- Video Link (Seed Phase) : https://youtu.be/WLsXvch95mY 
- Video Link (Scale Phase): https://youtu.be/3_K_QBM88Ro
- Video Link (Soar Phase) :
- PowerPoint Presentation : https://docs.google.com/presentation/d/1aVESAuyPeNqicBqcNrkGvkCgjBPoevSZ/edit?usp=sharing&ouid=114688269851244601174&rtpof=true&sd=true
