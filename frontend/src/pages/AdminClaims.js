import React, { useEffect, useState } from 'react';
import { apiGetAllClaims } from '../mock/api';
import { AlertTriangle, CheckCircle, Download } from 'lucide-react';

export default function AdminClaims() {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGetAllClaims().then(data => {
      setClaims(data);
      setLoading(false);
    });
  }, []);

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', paddingBottom: 40 }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }} className="fade-up">
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, margin: 0 }}>Global Claims Log</h2>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            Real-time feed of all parametric claims worldwide
          </div>
        </div>
        <button className="btn btn-ghost" style={{ fontSize: 13, padding: '8px 14px' }}>
          <Download size={14} /> Export CSV
        </button>
      </div>

      <div className="card fade-up fade-up-1">
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            <div className="spinner" style={{ margin: '0 auto 12px' }} />
            Loading claims...
          </div>
        ) : claims.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            No claims generated yet.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Date &amp; Rider</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Trigger Event</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Zone</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Payout</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Fraud Tier</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {claims.map((c, i) => {
                const date = new Date(c.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                return (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '16px' }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{date}</div>
                      <div style={{ fontWeight: 600 }}>{c.worker_name}</div>
                    </td>
                    <td style={{ padding: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>{c.trigger_event}</td>
                    <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>
                      <div>{c.zone}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.platform}</div>
                    </td>
                    <td style={{ padding: '16px', fontFamily: 'var(--font-display)', fontWeight: 600 }}>₹{c.payout_amount}</td>
                    <td style={{ padding: '16px' }}>
                      {c.fraud_tier === 1 ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--teal)', fontSize: 12 }}>
                          <CheckCircle size={14} /> Tier 1 (Safe)
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--amber)', fontSize: 12 }}>
                          <AlertTriangle size={14} /> Tier {c.fraud_tier} (Risk)
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span className="badge" style={{ 
                        background: c.status === 'Paid' ? 'var(--teal-dim)' : 'var(--amber-dim)',
                        color: c.status === 'Paid' ? 'var(--teal)' : 'var(--amber)',
                        border: 'none', padding: '4px 10px'
                      }}>
                        {c.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
