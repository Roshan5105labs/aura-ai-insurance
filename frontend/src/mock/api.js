// ── Aura API Layer ───────────────────────────────────────────
// Calls real FastAPI backend. Falls back to mock if unreachable.

const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Mock fallbacks ────────────────────────────────────────────
const MOCK_ONBOARD = {
  user_id        : "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  risk_score     : 0.55,
  risk_bucket    : "Medium",
  weekly_premium : 350,
  coverage_amount: 1000,
  confidence     : { Low: 0.1823, Medium: 0.6741, High: 0.1436 },
};

const MOCK_POLICY = {
  status         : "Active",
  expiry_date    : "2026-04-10",
  weekly_premium : 350,
  coverage_amount: 1000,
  current_triggers: [
    { type: "Rain",         value: "72.5mm/hr", is_active: true,  payout: 500 },
    { type: "Heat",         value: "32.0°C",    is_active: false, payout: 0   },
    { type: "AQI",          value: "AQI 145",   is_active: false, payout: 300 },
    { type: "Wind",         value: "35.0 km/h", is_active: false, payout: 400 },
    { type: "SocialDisrupt",value: "None",      is_active: false, payout: 600 },
  ],
};

const MOCK_CLAIMS = [
  { claim_id: "c1", trigger_event: "Heavy Rain",        timestamp: "2026-03-31T14:30:00Z", payout_amount: 500,  status: "Paid",        fraud_tier: 1 },
  { claim_id: "c2", trigger_event: "Extreme Heat",      timestamp: "2026-03-25T11:00:00Z", payout_amount: 300,  status: "Paid",        fraud_tier: 1 },
  { claim_id: "c3", trigger_event: "Social Disruption", timestamp: "2026-03-18T09:15:00Z", payout_amount: 600,  status: "UnderReview", fraud_tier: 2 },
];

// ── API calls ─────────────────────────────────────────────────

/**
 * POST /api/v1/onboard
 * Sends all ML feature fields as required by ML pricing engine.
 */
export async function apiOnboard(formData) {
  try {
    return await apiFetch("/api/v1/onboard", {
      method: "POST",
      body: JSON.stringify({
        name               : formData.name,
        password           : formData.password,
        platform           : formData.platform,
        zone               : formData.zone,
        city               : formData.city || "Mumbai",
        avg_daily_earnings : parseFloat(formData.avg_daily_earnings),
        // ML pricing engine fields
        hours_per_week     : parseFloat(formData.hours_per_week  || 48),
        vehicle_age_yrs    : parseFloat(formData.vehicle_age_yrs || 2),
        past_claims        : parseInt(formData.past_claims        || 0),
        gig_tenure_yrs     : parseFloat(formData.gig_tenure_yrs  || 1),
      }),
    });
  } catch (err) {
    console.warn("[Aura] Onboard failed:", err.message);
    throw err; // Stop masking backend failures! Let the UI show what failed.
  }
}

export async function apiLogin(loginData) {
  try {
    return await apiFetch("/api/v1/login", {
      method: "POST",
      body: JSON.stringify({
        name: loginData.name,
        password: loginData.password,
        phone: loginData.phone,
      }),
    });
  } catch (err) {
    console.warn("[Aura] Login failed:", err.message);
    if (err.message && err.message.includes("not found")) {
      throw err;
    }
    // Fallback Mock Login
    await new Promise(r => setTimeout(r, 1200));
    return MOCK_ONBOARD;
  }
}

export async function apiGetPolicy(userId) {
  if (!userId) return MOCK_POLICY;
  try {
    return await apiFetch(`/api/v1/policy/${userId}`);
  } catch (err) {
    console.warn("[Aura] Mock policy:", err.message);
    await new Promise(r => setTimeout(r, 500));
    return MOCK_POLICY;
  }
}

export async function apiGetClaims(userId) {
  if (!userId) return MOCK_CLAIMS;
  try {
    return await apiFetch(`/api/v1/claims/${userId}`);
  } catch (err) {
    console.warn("[Aura] Mock claims:", err.message);
    await new Promise(r => setTimeout(r, 500));
    return MOCK_CLAIMS;
  }
}

export async function apiTriggerClaim(userId, workerData) {
  try {
    return await apiFetch(`/api/v1/claims/trigger/${userId}`, {
      method: "POST",
      body: JSON.stringify({
        zone                   : workerData.zone,
        city                   : workerData.city || "Mumbai",
        avg_speed_kmph         : 28.0,
        max_speed_kmph         : 45.0,
        tower_changes_per_hour : 3.0,
        spatial_claim_density  : 1,
        platform_pings         : 15,
      }),
    });
  } catch (err) {
    if (err.message && (err.message.includes("No active trigger") || err.message.includes("Policy"))) {
      throw err;
    }
    console.warn("[Aura] Mock trigger:", err.message);
    await new Promise(r => setTimeout(r, 800));
    return {
      claim_id      : `mock-${Date.now()}`,
      trigger_event : "Heavy Rain",
      timestamp     : new Date().toISOString(),
      payout_amount : 500,
      status        : "Paid",
      fraud_tier    : 1,
    };
  }
}

// ── Admin mock data (no backend endpoint yet) ─────────────────
export const mockAdminStats = {
  total_workers          : 1248,
  active_policies        : 1102,
  claims_this_week       : 87,
  total_payout_this_week : 34560,
  fraud_blocked          : 12,
  loss_ratio             : 0.42,
  liquidity_pool         : 182000,
  payout_velocity        : "2.3 min avg",
};

export const mockWeeklyPayouts = [
  { week: "W1 Mar", payouts: 18200, premiums: 44080 },
  { week: "W2 Mar", payouts: 27500, premiums: 44080 },
  { week: "W3 Mar", payouts: 12000, premiums: 44080 },
  { week: "W4 Mar", payouts: 34560, premiums: 44080 },
  { week: "W1 Apr", payouts: 9800,  premiums: 44080 },
];

export const mockSyndicateAlerts = [
  { zone: "Andheri West", claim_count: 48, risk: "High",   status: "Flagged"    },
  { zone: "Kurla",        claim_count: 12, risk: "Low",    status: "Clear"      },
  { zone: "Dadar",        claim_count: 23, risk: "Medium", status: "Monitoring" },
];

// ── Admin API calls (real backend) ───────────────────────────

export async function apiGetAdminStats() {
  try {
    return await apiFetch("/api/v1/admin/stats");
  } catch (err) {
    console.warn("[Aura] Mock admin stats:", err.message);
    return mockAdminStats;
  }
}

export async function apiGetSyndicateAlerts() {
  try {
    return await apiFetch("/api/v1/admin/syndicate");
  } catch (err) {
    console.warn("[Aura] Mock syndicate:", err.message);
    return mockSyndicateAlerts;
  }
}

export async function apiGetWeeklyPayouts() {
  try {
    return await apiFetch("/api/v1/admin/weekly-payouts");
  } catch (err) {
    console.warn("[Aura] Mock weekly payouts:", err.message);
    return mockWeeklyPayouts;
  }
}

export async function apiRenewPolicy(userId) {
  try {
    return await apiFetch(`/api/v1/policy/${userId}/renew`, { method: "POST" });
  } catch (err) {
    console.warn("[Aura] Mock renewal:", err.message);
    await new Promise(r => setTimeout(r, 800));
    const d = new Date(); d.setDate(d.getDate() + 7);
    return {
      policy_id      : `mock-${Date.now()}`,
      expiry_date    : d.toISOString().split('T')[0],
      weekly_premium : 350,
      coverage_amount: 1000,
      risk_bucket    : "Medium",
      risk_score     : 0.55,
      confidence     : { Low: 0.18, Medium: 0.67, High: 0.15 },
    };
  }
}

export async function apiRunTriggerCycle() {
  try {
    return await apiFetch("/api/v1/admin/trigger-cycle", { method: "POST" });
  } catch (err) {
    console.warn("[Aura] Mock trigger cycle:", err.message);
    return { evaluated: 0, triggered: 0, total_payout: 0, details: [] };
  }
}

export async function apiGetAllPolicies() {
  try {
    return await apiFetch("/api/v1/admin/policies");
  } catch (err) {
    console.warn("[Aura] Mock all policies:", err.message);
    return [];
  }
}

export async function apiGetAllClaims() {
  try {
    return await apiFetch("/api/v1/admin/claims");
  } catch (err) {
    console.warn("[Aura] Mock all claims:", err.message);
    return [];
  }
}
