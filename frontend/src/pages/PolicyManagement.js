import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../App';
import { apiGetPolicy, apiRenewPolicy } from '../mock/api';
import { ShieldCheck, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';

export default function PolicyManagement() {
  const { worker, setWorker } = useContext(AppContext);
  const [policy, setPolicy]     = useState(null);
  const [loading, setLoading]   = useState(true);
  const [renewing, setRenewing] = useState(false);
  const [renewed, setRenewed]   = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => {
    if (!worker?.user_id) return;
    apiGetPolicy(worker.user_id).then(p => { setPolicy(p); setLoading(false); });
  }, [worker?.user_id]);

  const daysLeft = policy
    ? Math.max(0, Math.ceil((new Date(policy.expiry_date) - new Date()) / 86400000))
    : null;

  const handleRenew = async () => {
    setRenewing(true);
    setError('');
    try {
      // POST /api/v1/policy/{user_id}/renew — re-runs ML, creates new 7-day policy
      const res = await apiRenewPolicy(worker.user_id);
      setWorker(w => ({
        ...w,
        risk_score     : res.risk_score,
        risk_bucket    : res.risk_bucket,
        weekly_premium : res.weekly_premium,
        coverage_amount: res.coverage_amount,
      }));
      const freshPolicy = await apiGetPolicy(worker.user_id);
      setPolicy(freshPolicy);
      setRenewed(true);
    } catch (e) {
      setError(e.message || 'Renewal failed. Try again.');
    }
    setRenewing(false);
  };

  const riskColor =
    worker?.risk_bucket === 'Low'    ? 'var(--teal)'  :
    worker?.risk_bucket === 'Medium' ? 'var(--amber)' : 'var(--red)';

  return (
    <div>
      <div className="fade-up">
        <div className="page-title">Policy Management</div>
        <div className="page-subtitle">Manage your weekly income-loss coverage</div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div className="spinner" style={{ margin: '0 auto' }} />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

          {/* Policy status card */}
          <div className="card fade-up fade-up-1" style={{ gridColumn: '1 / -1' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 14, background: 'var(--teal-glow)',
                  border: '1px solid var(--border-accent)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', fontSize: 26
                }}>🛡️</div>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700 }}>
                    Aura Weekly Income Cover
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 2 }}>
                    {worker?.zone}, {worker?.city} · Loss of income only
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className={`badge ${policy?.status === 'Active' ? 'badge-teal' : 'badge-red'}`}>
                  <ShieldCheck size={12} /> {policy?.status ?? 'Unknown'}
                </span>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                  {daysLeft !== null ? `${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining` : '—'}
                </div>
              </div>
            </div>

            {/* Expiry bar */}
            <div style={{ marginTop: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
                <span>Coverage period (7 days)</span>
                <span>Expires {policy?.expiry_date}</span>
              </div>
              <div className="risk-meter" style={{ height: 8 }}>
                <div style={{
                  height: '100%', borderRadius: 4,
                  width: `${Math.max(5, (daysLeft / 7) * 100)}%`,
                  background: daysLeft <= 1 ? 'var(--red)' : daysLeft <= 3 ? 'var(--amber)' : 'var(--teal)',
                  transition: 'width 1s ease'
                }} />
              </div>
            </div>
          </div>

          {/* Coverage details */}
          <div className="card fade-up fade-up-2">
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, marginBottom: 20 }}>
              Coverage Details
            </h3>
            {[
              { label: 'Weekly Premium',    value: `₹${policy?.weekly_premium ?? worker?.weekly_premium}` },
              { label: 'Max Coverage',      value: `₹${(policy?.coverage_amount ?? worker?.coverage_amount ?? 0).toLocaleString()}` },
              { label: 'Coverage Factor',   value: '0.8 × trigger hours' },
              { label: 'Payout Channel',    value: 'UPI (Instant)' },
              { label: 'Notification',      value: 'WhatsApp first' },
              { label: 'Coverage Type',     value: 'Loss of Income Only ✅' },
              { label: 'Excluded',          value: 'Health / Vehicle / Accident ❌' },
            ].map(row => (
              <div key={row.label} style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '11px 0', borderBottom: '1px solid var(--border)', fontSize: 14
              }}>
                <span style={{ color: 'var(--text-secondary)' }}>{row.label}</span>
                <span style={{ fontWeight: 600, fontFamily: 'var(--font-display)', fontSize: 13 }}>{row.value}</span>
              </div>
            ))}
          </div>

          {/* Risk profile + renew */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Risk profile */}
            <div className="card fade-up fade-up-3">
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, marginBottom: 16 }}>
                Your Risk Profile
              </h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Risk Score</span>
                <span className="badge" style={{ background: `${riskColor}18`, color: riskColor, border: `1px solid ${riskColor}40` }}>
                  {worker?.risk_bucket}
                </span>
              </div>
              <div className="risk-meter">
                <div
                  className={`risk-fill ${worker?.risk_bucket?.toLowerCase()}`}
                  style={{ width: `${(worker?.risk_score ?? 0.5) * 100}%` }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Safe (0.0)</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{(worker?.risk_score ?? 0.5).toFixed(4)}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>High (1.0)</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12 }}>
                Score computed from hyperlocal rainfall, AQI, zone risk, work pattern, claim history, and rider tenure.
                Refreshed on each renewal.
              </div>
            </div>

            {/* Renew card */}
            <div className="card fade-up fade-up-4">
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, marginBottom: 12 }}>
                Renew Policy
              </h3>

              {renewed ? (
                <div style={{
                  background: 'var(--teal-glow)', border: '1px solid var(--border-accent)',
                  borderRadius: 8, padding: 16, textAlign: 'center'
                }}>
                  <CheckCircle size={24} style={{ color: 'var(--teal)', marginBottom: 8 }} />
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--teal)' }}>
                    Policy Renewed!
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                    New expiry: {policy?.expiry_date}. Risk score refreshed.
                  </div>
                  <button className="btn btn-ghost" style={{ margin: '12px auto 0', width: '100%', justifyContent: 'center' }}
                    onClick={() => setRenewed(false)}>
                    Done
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.6 }}>
                    Renewing re-runs the AI risk engine with fresh weather + zone data and extends your coverage by 7 days.
                  </div>
                  {daysLeft !== null && daysLeft <= 2 && (
                    <div style={{
                      background: 'var(--amber-dim)', border: '1px solid rgba(245,158,11,0.3)',
                      borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--amber)',
                      marginBottom: 14, display: 'flex', gap: 8, alignItems: 'center'
                    }}>
                      <AlertCircle size={14} /> Policy expires soon — renew now to stay protected.
                    </div>
                  )}
                  {error && (
                    <div style={{
                      background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,0.3)',
                      borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--red)', marginBottom: 14
                    }}>
                      ⚠️ {error}
                    </div>
                  )}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', fontSize: 13,
                    background: 'var(--bg-glass)', borderRadius: 8, padding: '10px 14px', marginBottom: 14
                  }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Renewal amount</span>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--teal)' }}>
                      ₹{policy?.weekly_premium ?? worker?.weekly_premium} via UPI
                    </span>
                  </div>
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%', justifyContent: 'center' }}
                    onClick={handleRenew}
                    disabled={renewing}
                  >
                    {renewing
                      ? <><div className="spinner" /> Renewing…</>
                      : <><RefreshCw size={15} /> Renew for 7 Days</>
                    }
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Parametric triggers covered */}
          <div className="card fade-up fade-up-4" style={{ gridColumn: '1 / -1' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, marginBottom: 16 }}>
              Covered Disruptions & Payout Hours
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
              {[
                { emoji: '🌧️', type: 'Heavy Rain',        threshold: '> 50 mm',    payout: 500,  color: 'var(--blue)'   },
                { emoji: '💨', type: 'Hazardous AQI',     threshold: '> AQI 300',  payout: 300,  color: 'var(--amber)'  },
                { emoji: '🌪️', type: 'High Winds',        threshold: '> 60 km/h',  payout: 400,  color: 'var(--amber)'  },
                { emoji: '📍', type: 'High-Risk Zone',    threshold: 'Zone = HIGH', payout: 200,  color: 'var(--red)'    },
                { emoji: '🚨', type: 'Social Disruption', threshold: 'NLP trigger', payout: 600,  color: 'var(--red)'    },
              ].map(t => (
                <div key={t.type} style={{
                  padding: '14px 12px', background: 'var(--bg-glass)', border: '1px solid var(--border)',
                  borderRadius: 10, textAlign: 'center'
                }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>{t.emoji}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: t.color, marginBottom: 4 }}>{t.type}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>{t.threshold}</div>
                  <div style={{
                    fontSize: 13, fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--teal)'
                  }}>
                    +₹{t.payout}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
              Payouts stack — Rain + AQI + Wind + Zone + Social = up to ₹2,000 per event · Loss of income only
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
