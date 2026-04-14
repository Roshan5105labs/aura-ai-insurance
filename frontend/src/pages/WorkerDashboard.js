import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../App';
import { apiGetClaims, apiGetNotifications, apiGetPolicy, apiTriggerClaim } from '../mock/api';
import { AlertTriangle, CheckCircle, CloudRain, MessageSquare, Thermometer, Wind, Zap } from 'lucide-react';

const TRIGGER_META = {
  Rain: { icon: <CloudRain size={16} />, payout: 500, label: 'Heavy Rain' },
  Heat: { icon: <Thermometer size={16} />, payout: 0, label: 'Extreme Heat' },
  AQI: { icon: <Wind size={16} />, payout: 300, label: 'Hazardous AQI' },
  Wind: { icon: <Zap size={16} />, payout: 400, label: 'High Winds' },
  ZoneRisk: { icon: <AlertTriangle size={16} />, payout: 200, label: 'High-Risk Zone' },
  SocialDisrupt: { icon: <AlertTriangle size={16} />, payout: 600, label: 'Social Disruption' },
};

export default function WorkerDashboard() {
  const { worker } = useContext(AppContext);
  const [policy, setPolicy] = useState(null);
  const [claims, setClaims] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [simState, setSimState] = useState('idle');
  const [simResult, setSimResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!worker?.user_id) return;
    setLoading(true);
    Promise.all([
      apiGetPolicy(worker.user_id),
      apiGetClaims(worker.user_id),
      apiGetNotifications(worker.user_id),
    ]).then(([p, c, n]) => {
      setPolicy(p);
      setClaims(c);
      setNotifications(n);
      setLoading(false);
    });
  }, [worker?.user_id]);

  const activeTriggers = policy?.current_triggers?.filter(t => t.is_active) ?? [];
  const potentialPayout = activeTriggers.reduce((s, t) => s + (t.payout ?? TRIGGER_META[t.type]?.payout ?? 0), 0);
  const totalProtected = claims
    .filter(c => c.status === 'Paid' || c.status === 'Processing')
    .reduce((s, c) => s + c.payout_amount, 0);

  const handleSimulate = async () => {
    setSimState('loading');
    try {
      const res = await apiTriggerClaim(worker.user_id, worker);
      setSimResult(res);
      const [updatedClaims, updatedNotifications] = await Promise.all([
        apiGetClaims(worker.user_id),
        apiGetNotifications(worker.user_id),
      ]);
      setClaims(updatedClaims);
      setNotifications(updatedNotifications);
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
            <div className="page-title">Welcome back, {worker?.name?.split(' ')[0]}</div>
            <div className="page-subtitle">{worker?.platform} · {worker?.zone}, {worker?.city} · Aura policy active</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Expires</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--teal)' }}>{policy?.expiry_date ?? '-'}</div>
          </div>
        </div>
      </div>

      {activeTriggers.length > 0 && (
        <div className="fade-up" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '16px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--red)', flexShrink: 0 }}>
            <AlertTriangle size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: 'var(--red)', fontFamily: 'var(--font-display)', fontSize: 15 }}>
              {activeTriggers.length} trigger{activeTriggers.length > 1 ? 's' : ''} active · stackable payout Rs.{potentialPayout}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
              {activeTriggers.map(t => t.type).join(' + ')} detected in {worker?.zone}. Aura is ready to process the claim.
            </div>
          </div>
          <button className="btn btn-primary" style={{ flexShrink: 0 }} onClick={handleSimulate}>Claim Now</button>
        </div>
      )}

      <div className="stats-grid fade-up fade-up-1">
        {[
          { label: 'Weekly Premium', value: `Rs.${worker?.weekly_premium ?? policy?.weekly_premium ?? '-'}`, delta: 'ML priced weekly' },
          { label: 'Coverage', value: `Rs.${(worker?.coverage_amount ?? policy?.coverage_amount ?? 0).toLocaleString()}`, delta: 'Max per week' },
          { label: 'Protected Amount', value: `Rs.${totalProtected.toLocaleString()}`, delta: 'Paid + processing' },
          { label: 'Claims Paid', value: claims.filter(c => c.status === 'Paid').length, delta: 'UPI' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-delta">{s.delta}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card fade-up fade-up-2">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>Live Trigger Monitor</h3>
            <span className="badge badge-teal">6 conditions</span>
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
                      <span className="badge badge-red" style={{ fontSize: 10 }}>+Rs.{meta.payout}</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <div style={{ marginTop: 14, padding: '8px 12px', background: 'var(--bg-glass)', borderRadius: 8, border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)' }}>
            Payouts stack - Rain + AQI + Wind + Zone = Rs.1400 in one disruption window
          </div>
        </div>

        <div className="card fade-up fade-up-3">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>Payout Simulator</h3>
            <span className="badge badge-amber">Aura demo</span>
          </div>

          {simState === 'idle' && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 38, marginBottom: 12 }}>CLOUD</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 8 }}>Simulate a disruption event</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>Multiple triggers stack their payouts automatically</div>
              <button className="btn btn-primary" onClick={handleSimulate} style={{ margin: '0 auto' }}>Trigger Simulation</button>
            </div>
          )}

          {simState === 'loading' && (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div className="spinner" style={{ margin: '0 auto 16px', width: 32, height: 32 }} />
              <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Aura is evaluating the trigger window</div>
            </div>
          )}

          {simState === 'done' && simResult && !simResult.error && (
            <div className="fade-up">
              <div style={{ textAlign: 'center', margin: '8px 0 16px' }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Claim outcome</div>
                <div className="payout-amount">Rs.{simResult.payout_amount}</div>
                <div style={{ fontSize: 13, color: simResult.status === 'Paid' ? 'var(--teal)' : 'var(--amber)', marginTop: 4 }}>
                  {simResult.status === 'Paid' ? 'UPI payout completed' : simResult.status === 'Processing' ? 'UPI payout processing in Razorpay' : 'Under review'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  Fraud score: {simResult.fraud_score?.toFixed?.(3) ?? simResult.fraud_score} · {simResult.fraud_tier === 1 ? 'T1 Auto-approved' : simResult.fraud_tier === 2 ? 'T2 Review' : 'T3 Manual check'}
                </div>
              </div>
              {[
                'Hyperlocal trigger verified',
                'Risk telemetry scored with anomaly model',
                simResult.review_reason || 'Claim matched normal rider behaviour',
                `Payment channel: ${simResult.payout_provider || 'Razorpay Test Mode'} ${simResult.payout_method || 'UPI'}`,
              ].map((s, i) => (
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
              <div style={{ fontSize: 24, marginBottom: 8 }}>Alert</div>
              <div style={{ fontSize: 14 }}>{simResult.error}</div>
              <button className="btn btn-ghost" style={{ margin: '14px auto 0' }} onClick={() => { setSimState('idle'); setSimResult(null); }}>Try Again</button>
            </div>
          )}
        </div>
      </div>

      <div className="card fade-up fade-up-4" style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>Aura Worker Updates</h3>
          <span className="badge badge-teal"><MessageSquare size={11} /> WhatsApp-first</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {notifications.slice(0, 3).map((item, idx) => (
            <div key={`${item.timestamp}-${idx}`} style={{ padding: '14px 16px', background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ fontWeight: 600 }}>{item.title}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.channel}</div>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.5 }}>{item.body}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card fade-up fade-up-4" style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>Recent Claims</h3>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Live + mock-safe</span>
        </div>
        <table className="table">
          <thead><tr><th>Event</th><th>Date</th><th>Payout</th><th>Status</th><th>Tier</th></tr></thead>
          <tbody>
            {claims.slice(0, 5).map(c => (
              <tr key={c.claim_id}>
                <td>{c.trigger_event}</td>
                <td style={{ color: 'var(--text-secondary)' }}>{new Date(c.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
                <td style={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--teal)' }}>Rs.{c.payout_amount}</td>
                <td>
                  <span className={`badge ${c.status === 'Paid' ? 'badge-teal' : c.status === 'UnderReview' ? 'badge-amber' : 'badge-blue'}`}>
                    {c.status === 'Paid' ? <CheckCircle size={11} /> : <AlertTriangle size={11} />} {c.status}
                  </span>
                </td>
                <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.fraud_tier === 1 ? 'T1' : c.fraud_tier === 2 ? 'T2' : 'T3'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
