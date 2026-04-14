import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../App';
import { apiGetClaims } from '../mock/api';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';

const statusConfig = {
  Paid: { icon: <CheckCircle size={14} />, cls: 'badge-teal' },
  Processing: { icon: <Clock size={14} />, cls: 'badge-blue' },
  UnderReview: { icon: <Clock size={14} />, cls: 'badge-amber' },
  Approved: { icon: <CheckCircle size={14} />, cls: 'badge-blue' },
  Rejected: { icon: <AlertCircle size={14} />, cls: 'badge-red' },
};

const fraudLabel = { 1: 'Tier 1 - Auto', 2: 'Tier 2 - Review', 3: 'Tier 3 - Manual' };

export default function Claims() {
  const { worker } = useContext(AppContext);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGetClaims(worker?.user_id).then(c => {
      setClaims(c);
      setLoading(false);
    });
  }, [worker?.user_id]);

  const totalPaid = claims
    .filter(c => c.status === 'Paid' || c.status === 'Processing')
    .reduce((s, c) => s + c.payout_amount, 0);

  return (
    <div>
      <div className="fade-up">
        <div className="page-title">Claims History</div>
        <div className="page-subtitle">Automated parametric payouts and review outcomes for Aura</div>
      </div>

      <div className="stats-grid fade-up fade-up-1">
        {[
          { label: 'Total Claims', value: claims.length },
          { label: 'Protected Amount', value: `Rs.${totalPaid.toLocaleString()}`, color: 'var(--teal)' },
          { label: 'Under Review', value: claims.filter(c => c.status === 'UnderReview').length, color: 'var(--amber)' },
          { label: 'Processing', value: claims.filter(c => c.status === 'Processing').length },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{ color: s.color || 'var(--text-primary)' }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="card fade-up fade-up-2">
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, marginBottom: 20 }}>
          All Claims
        </h3>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div className="spinner" style={{ margin: '0 auto' }} />
          </div>
        ) : claims.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>Ledger</div>
            <div>No claims yet. Use the dashboard simulator to create one.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {claims.map(c => (
              <div key={c.claim_id} style={{
                display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px',
                background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: 10
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                  background: 'rgba(16,185,129,0.08)'
                }}>
                  AIR
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontFamily: 'var(--font-display)', fontSize: 15 }}>
                    {c.trigger_event}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                    {new Date(c.timestamp).toLocaleString('en-IN', {
                      day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
                    })}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    {fraudLabel[c.fraud_tier] ?? `Tier ${c.fraud_tier}`} · Score {typeof c.fraud_score === 'number' ? c.fraud_score.toFixed(3) : c.fraud_score}
                  </div>
                  {c.review_reason && (
                    <div style={{ fontSize: 11, color: 'var(--amber)', marginTop: 4 }}>
                      Review note: {c.review_reason}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: 'var(--teal)' }}>
                    Rs.{c.payout_amount}
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <span className={`badge ${statusConfig[c.status]?.cls || 'badge-teal'}`}>
                      {statusConfig[c.status]?.icon} {c.status}
                    </span>
                  </div>
                  {c.payout_provider && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5 }}>
                      {c.payout_provider} · {c.payout_method}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card fade-up fade-up-3" style={{ marginTop: 20 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, marginBottom: 16 }}>
          How Aura Claims Work
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {[
            { step: '01', title: 'Trigger Detected', desc: 'Aura checks hyperlocal weather, AQI, wind, social disruption, and high-risk zone signals for Indian delivery areas.' },
            { step: '02', title: 'Fraud Check', desc: 'An anomaly model scores movement telemetry, tower changes, same-zone density, and platform activity before approval.' },
            { step: '03', title: 'UPI Payout', desc: 'Approved claims move through Razorpay-compatible UPI payment states such as Processing and Paid.' },
          ].map(item => (
            <div key={item.step} style={{ padding: 16, background: 'var(--bg-glass)', borderRadius: 10, border: '1px solid var(--border)' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: 'var(--teal)', opacity: 0.5, marginBottom: 8 }}>
                {item.step}
              </div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>{item.title}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
