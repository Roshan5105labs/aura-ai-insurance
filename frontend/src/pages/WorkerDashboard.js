import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../App';
import { apiGetPolicy, apiGetClaims, apiTriggerClaim } from '../mock/api';
import { CloudRain, Thermometer, Wind, AlertTriangle, CheckCircle, Clock, Zap, TrendingDown } from 'lucide-react';

const TRIGGER_META = {
  Rain        : { icon: <CloudRain size={16} />,    payout: 500,  label: 'Heavy Rain'         },
  Heat        : { icon: <Thermometer size={16} />,  payout: 0,    label: 'Extreme Heat'        },
  AQI         : { icon: <Wind size={16} />,          payout: 300,  label: 'Hazardous AQI'      },
  Wind        : { icon: <Zap size={16} />,           payout: 400,  label: 'High Winds'         },
  SocialDisrupt:{ icon: <AlertTriangle size={16} />, payout: 600,  label: 'Social Disruption'  },
};

export default function WorkerDashboard() {
  const { worker } = useContext(AppContext);
  const [policy, setPolicy]       = useState(null);
  const [claims, setClaims]       = useState([]);
  const [simState, setSimState]   = useState('idle');
  const [simResult, setSimResult] = useState(null);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    if (!worker?.user_id) return;
    setLoading(true);
    Promise.all([apiGetPolicy(worker.user_id), apiGetClaims(worker.user_id)])
      .then(([p, c]) => { setPolicy(p); setClaims(c); setLoading(false); });
  }, [worker?.user_id]);

  const activeTriggers  = policy?.current_triggers?.filter(t => t.is_active) ?? [];
  const potentialPayout = activeTriggers.reduce((s, t) => s + (t.payout ?? TRIGGER_META[t.type]?.payout ?? 0), 0);
  const totalProtected  = claims.filter(c => c.status === 'Paid').reduce((s, c) => s + c.payout_amount, 0);

  const handleSimulate = async () => {
    setSimState('loading');
    try {
      const res = await apiTriggerClaim(worker.user_id, worker);
      setSimResult(res);
      const updated = await apiGetClaims(worker.user_id);
      setClaims(updated);
    } catch (e) {
      setSimResult({ error: e.message });
    }
    setSimState('done');
  };

  return (
    <div>
      <div className="fade-up">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
          <div>
            <div className="page-title">Welcome back, {worker?.name?.split(' ')[0]} 👋</div>
            <div className="page-subtitle">{worker?.platform} · {worker?.zone}, {worker?.city} · Policy Active</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Expires</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--teal)' }}>{policy?.expiry_date ?? '—'}</div>
          </div>
        </div>
      </div>

      {/* Active trigger banner */}
      {activeTriggers.length > 0 && (
        <div className="fade-up" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '16px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--red)', flexShrink: 0 }}>
            <AlertTriangle size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: 'var(--red)', fontFamily: 'var(--font-display)', fontSize: 15 }}>
              ⚡ {activeTriggers.length} Trigger{activeTriggers.length > 1 ? 's' : ''} Active — Stackable payout: ₹{potentialPayout}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
              {activeTriggers.map(t => t.type).join(' + ')} detected in {worker?.zone}. Claim processing automatically.
            </div>
          </div>
          <button className="btn btn-primary" style={{ flexShrink: 0 }} onClick={handleSimulate}>Claim Now</button>
        </div>
      )}

      {/* Stats */}
      <div className="stats-grid fade-up fade-up-1">
        {[
          { label: 'Weekly Premium',    value: `₹${worker?.weekly_premium ?? policy?.weekly_premium ?? '—'}`,  delta: 'ML-priced weekly' },
          { label: 'Coverage',          value: `₹${(worker?.coverage_amount ?? policy?.coverage_amount ?? 0).toLocaleString()}`, delta: 'Max per week' },
          { label: 'Earnings Protected',value: `₹${totalProtected.toLocaleString()}`, delta: '↑ All time' },
          { label: 'Claims Paid',       value: claims.filter(c => c.status === 'Paid').length, delta: 'Instant UPI' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-delta">{s.delta}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Trigger monitor */}
        <div className="card fade-up fade-up-2">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>Live Trigger Monitor</h3>
            <span className="badge badge-teal">5 conditions</span>
          </div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 32 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {policy?.current_triggers?.map(t => {
                const meta = TRIGGER_META[t.type] ?? {};
                return (
                  <div key={t.type} className="trigger-pill" style={{ borderColor: t.is_active ? 'rgba(239,68,68,0.3)' : 'var(--border)', background: t.is_active ? 'rgba(239,68,68,0.05)' : 'var(--bg-glass)' }}>
                    <div className="trigger-dot" style={{ background: t.is_active ? 'var(--red)' : 'var(--text-muted)', ...(t.is_active ? { animation: 'pulse-teal 1.5s infinite' } : {}) }} />
                    <span style={{ color: t.is_active ? 'var(--red)' : 'var(--text-secondary)' }}>{meta.icon}</span>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: t.is_active ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{t.type}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-display)' }}>{t.value}</span>
                    {t.is_active && meta.payout > 0 && (
                      <span className="badge badge-red" style={{ fontSize: 10 }}>+₹{meta.payout}</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <div style={{ marginTop: 14, padding: '8px 12px', background: 'var(--bg-glass)', borderRadius: 8, border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)' }}>
            💡 Payouts <strong style={{ color: 'var(--teal)' }}>stack</strong> — Rain+AQI+Wind = ₹1,200 simultaneously
          </div>
        </div>

        {/* Payout simulator */}
        <div className="card fade-up fade-up-3">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>Payout Simulator</h3>
            <span className="badge badge-amber">Demo</span>
          </div>

          {simState === 'idle' && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 38, marginBottom: 12 }}>⛈️</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 8 }}>Simulate a disruption event</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>Multiple triggers stack their payouts automatically</div>
              <button className="btn btn-primary" onClick={handleSimulate} style={{ margin: '0 auto' }}>⚡ Trigger Simulation</button>
            </div>
          )}

          {simState === 'loading' && (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div className="spinner" style={{ margin: '0 auto 16px', width: 32, height: 32 }} />
              <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>ML trigger engine evaluating…</div>
            </div>
          )}

          {simState === 'done' && simResult && !simResult.error && (
            <div className="fade-up">
              <div style={{ textAlign: 'center', margin: '8px 0 16px' }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Stackable payout credited</div>
                <div className="payout-amount">₹{simResult.payout_amount}</div>
                <div style={{ fontSize: 13, color: simResult.status === 'Paid' ? 'var(--teal)' : 'var(--amber)', marginTop: 4 }}>
                  {simResult.status === 'Paid' ? '✅ UPI payout initiated' : '⏳ Under review (Tier 2)'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  Fraud Tier: {simResult.fraud_tier === 1 ? '✅ T1 Auto-approved' : simResult.fraud_tier === 2 ? '⏳ T2 Under review' : '🚨 T3 Manual check'}
                </div>
              </div>
              {['Rain trigger verified (ML engine)', 'GPS trajectory validated', `Isolation Forest: Tier ${simResult.fraud_tier} passed`, `UPI payout ${simResult.status === 'Paid' ? 'sent' : 'queued'}`].map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, marginBottom: 6 }}>
                  <CheckCircle size={13} style={{ color: 'var(--teal)', flexShrink: 0 }} />
                  <span style={{ color: 'var(--text-secondary)' }}>{s}</span>
                </div>
              ))}
              <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', marginTop: 14 }} onClick={() => { setSimState('idle'); setSimResult(null); }}>Reset</button>
            </div>
          )}

          {simState === 'done' && simResult?.error && (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--red)' }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>⚠️</div>
              <div style={{ fontSize: 14 }}>{simResult.error}</div>
              <button className="btn btn-ghost" style={{ margin: '14px auto 0' }} onClick={() => { setSimState('idle'); setSimResult(null); }}>Try Again</button>
            </div>
          )}
        </div>
      </div>

      {/* Recent claims */}
      <div className="card fade-up fade-up-4" style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>Recent Claims</h3>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>PostgreSQL · live</span>
        </div>
        <table className="table">
          <thead><tr><th>Event</th><th>Date</th><th>Payout</th><th>Status</th><th>Tier</th></tr></thead>
          <tbody>
            {claims.slice(0, 5).map(c => (
              <tr key={c.claim_id}>
                <td>{c.trigger_event}</td>
                <td style={{ color: 'var(--text-secondary)' }}>{new Date(c.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
                <td style={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--teal)' }}>₹{c.payout_amount}</td>
                <td>
                  <span className={`badge ${c.status === 'Paid' ? 'badge-teal' : c.status === 'UnderReview' ? 'badge-amber' : 'badge-blue'}`}>
                    {c.status === 'Paid' ? <CheckCircle size={11} /> : <Clock size={11} />} {c.status}
                  </span>
                </td>
                <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.fraud_tier === 1 ? '✅ T1' : c.fraud_tier === 2 ? '⏳ T2' : '🚨 T3'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
