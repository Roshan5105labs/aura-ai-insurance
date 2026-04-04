import React, { useEffect, useState } from 'react';
import { apiGetAllPolicies } from '../mock/api';
import { ShieldAlert, Download, Activity, Calendar } from 'lucide-react';

export default function AdminPolicies() {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGetAllPolicies().then(data => {
      setPolicies(data);
      setLoading(false);
    });
  }, []);

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', paddingBottom: 40 }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }} className="fade-up">
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, margin: 0 }}>Global Policies</h2>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            All active parametric policies across the platform
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
            Loading policies...
          </div>
        ) : policies.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            No active policies found.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Rider</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Zone</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Risk</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Premium</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Coverage</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {policies.map((p, i) => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '16px' }}>
                    <div style={{ fontWeight: 600 }}>{p.worker_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{p.platform}</div>
                  </td>
                  <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>{p.zone}</td>
                  <td style={{ padding: '16px' }}>
                    <span className="badge" style={{ 
                      background: p.risk_bucket === 'Low' ? 'var(--teal-dim)' : p.risk_bucket === 'Medium' ? 'var(--amber-dim)' : 'var(--red-dim)',
                      color: p.risk_bucket === 'Low' ? 'var(--teal)' : p.risk_bucket === 'Medium' ? 'var(--amber)' : 'var(--red)',
                      border: 'none', padding: '4px 10px'
                    }}>
                      {p.risk_bucket}
                    </span>
                  </td>
                  <td style={{ padding: '16px', fontFamily: 'var(--font-display)', fontWeight: 600 }}>₹{p.weekly_premium}/wk</td>
                  <td style={{ padding: '16px', fontFamily: 'var(--font-display)', color: 'var(--text-secondary)' }}>₹{p.coverage_amount}</td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--teal)', fontSize: 12, fontWeight: 600 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--teal)', boxShadow: '0 0 8px var(--teal)' }} />
                      {p.status}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
