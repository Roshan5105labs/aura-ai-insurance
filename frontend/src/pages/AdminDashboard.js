import React, { useEffect, useState } from 'react';
import {
  apiGetAdminStats, apiGetSyndicateAlerts,
  apiGetWeeklyPayouts, apiRunTriggerCycle,
} from '../mock/api';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { AlertTriangle, TrendingUp, Shield, RefreshCw, Play } from 'lucide-react';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
      <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color, fontFamily: 'var(--font-display)', fontWeight: 600 }}>
          {p.name}: ₹{p.value?.toLocaleString()}
        </div>
      ))}
    </div>
  );
};

export default function AdminDashboard() {
  const [stats,     setStats]     = useState(null);
  const [syndicate, setSyndicate] = useState([]);
  const [payouts,   setPayouts]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [cycling,   setCycling]   = useState(false);
  const [cycleResult, setCycleResult] = useState(null);

  const loadAll = async () => {
    setLoading(true);
    const [s, sy, p] = await Promise.all([
      apiGetAdminStats(),
      apiGetSyndicateAlerts(),
      apiGetWeeklyPayouts(),
    ]);
    setStats(s); setSyndicate(sy); setPayouts(p);
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  const handleTriggerCycle = async () => {
    setCycling(true); setCycleResult(null);
    const res = await apiRunTriggerCycle();
    setCycleResult(res);
    setCycling(false);
    // Refresh stats after cycle
    await loadAll();
  };

  const s = stats;

  return (
    <div>
      <div className="fade-up">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
          <div>
            <div className="page-title">Admin Dashboard 🛡️</div>
            <div className="page-subtitle">Live DB metrics · Fraud monitor · Trigger engine control</div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-ghost" onClick={loadAll} disabled={loading}>
              <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
              Refresh
            </button>
            <button className="btn btn-primary" onClick={handleTriggerCycle} disabled={cycling}>
              {cycling ? <><div className="spinner" /> Running…</> : <><Play size={14} /> Run Trigger Cycle</>}
            </button>
          </div>
        </div>
      </div>

      {/* Trigger cycle result */}
      {cycleResult && (
        <div className="fade-up" style={{
          background: cycleResult.triggered > 0 ? 'rgba(239,68,68,0.06)' : 'var(--teal-glow)',
          border: `1px solid ${cycleResult.triggered > 0 ? 'rgba(239,68,68,0.3)' : 'var(--border-accent)'}`,
          borderRadius: 10, padding: '14px 20px', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 16
        }}>
          <div style={{ fontSize: 24 }}>{cycleResult.triggered > 0 ? '⚡' : '🟢'}</div>
          <div>
            <div style={{ fontWeight: 700, fontFamily: 'var(--font-display)', fontSize: 15 }}>
              Trigger Cycle Complete — {cycleResult.evaluated} workers evaluated
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
              {cycleResult.triggered} claims triggered · ₹{cycleResult.total_payout} paid out · Runs automatically every 60 min
            </div>
          </div>
        </div>
      )}

      {/* Live stats grid */}
      <div className="stats-grid fade-up fade-up-1">
        {loading ? Array(6).fill(0).map((_, i) => (
          <div key={i} className="stat-card">
            <div style={{ height: 12, background: 'var(--bg-glass)', borderRadius: 4, marginBottom: 12 }} />
            <div style={{ height: 28, background: 'var(--bg-glass)', borderRadius: 4 }} />
          </div>
        )) : [
          { label: 'Total Workers',     value: s?.total_workers?.toLocaleString(),                 delta: 'Registered' },
          { label: 'Active Policies',   value: s?.active_policies?.toLocaleString(),               delta: `${s ? Math.round(s.active_policies/Math.max(s.total_workers,1)*100) : 0}% activation rate` },
          { label: 'Claims This Week',  value: s?.claims_this_week,                                delta: `₹${s?.total_payout_this_week?.toLocaleString()} paid` },
          { label: 'Fraud Blocked',     value: s?.fraud_blocked,                                   delta: 'Tier 3 rejections' },
          { label: 'Loss Ratio',        value: `${((s?.loss_ratio ?? 0) * 100).toFixed(1)}%`,     delta: 'Target < 60%', color: (s?.loss_ratio ?? 0) > 0.6 ? 'var(--red)' : 'var(--teal)' },
          { label: 'Liquidity Pool',    value: `₹${Math.round((s?.liquidity_pool ?? 0)/1000)}K`,  delta: 'Premium surplus' },
        ].map(st => (
          <div key={st.label} className="stat-card">
            <div className="stat-label">{st.label}</div>
            <div className="stat-value" style={{ color: st.color || 'var(--text-primary)' }}>{st.value ?? '—'}</div>
            <div className="stat-delta">{st.delta}</div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Area chart */}
        <div className="card fade-up fade-up-2">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>Weekly Payouts vs Premiums</h3>
            <span className="badge badge-teal"><TrendingUp size={12} /> Live DB</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={payouts}>
              <defs>
                <linearGradient id="gPremium" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00d28c" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#00d28c" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gPayouts" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="week" tick={{ fill: '#8899aa', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#8899aa', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="premiums" name="Premiums" stroke="#00d28c" fill="url(#gPremium)" strokeWidth={2} />
              <Area type="monotone" dataKey="payouts"  name="Payouts"  stroke="#f59e0b" fill="url(#gPayouts)"  strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Liquidity pool */}
        <div className="card fade-up fade-up-3">
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, marginBottom: 20 }}>Liquidity Pool</h3>
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Available Balance</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 800, color: 'var(--teal)' }}>
              ₹{Math.round((s?.liquidity_pool ?? 0) / 1000)}K
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
              ₹{(s?.liquidity_pool ?? 0).toLocaleString()} total
            </div>
          </div>
          <div style={{ margin: '16px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
              <span>Pool Utilization</span>
              <span>{s ? Math.round(s.total_payout_this_week / Math.max(s.liquidity_pool, 1) * 100) : 0}%</span>
            </div>
            <div className="risk-meter" style={{ height: 10 }}>
              <div style={{
                height: '100%', borderRadius: 5, background: 'var(--teal)', transition: 'width 1s ease',
                width: `${s ? Math.min(Math.round(s.total_payout_this_week / Math.max(s.liquidity_pool, 1) * 100), 100) : 0}%`
              }} />
            </div>
          </div>
          <div style={{ background: 'var(--teal-glow)', border: '1px solid var(--border-accent)', borderRadius: 8, padding: 12, fontSize: 13, color: 'var(--teal)' }}>
            <Shield size={13} style={{ display: 'inline', marginRight: 6 }} />
            {(s?.loss_ratio ?? 0) < 0.6 ? 'Pool health: Excellent' : 'Pool health: Monitor closely'}
          </div>
        </div>
      </div>

      {/* Syndicate alerts */}
      <div className="card fade-up fade-up-4">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>
            🚨 Syndicate Fraud Monitor
          </h3>
          <span className="badge badge-amber"><AlertTriangle size={11} /> Spatial Clustering · Live DB</span>
        </div>
        <table className="table">
          <thead>
            <tr><th>Zone</th><th>Claims (1hr window)</th><th>Fraud Risk</th><th>Status</th></tr>
          </thead>
          <tbody>
            {syndicate.map((row, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 500 }}>{row.zone}</td>
                <td style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>{row.claim_count}</td>
                <td>
                  <span className={`badge ${row.risk === 'High' ? 'badge-red' : row.risk === 'Medium' ? 'badge-amber' : 'badge-teal'}`}>
                    {row.risk}
                  </span>
                </td>
                <td>
                  <span className={`badge ${row.status === 'Flagged' ? 'badge-red' : row.status === 'Monitoring' ? 'badge-amber' : 'badge-teal'}`}>
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
          Zones with <strong style={{ color: 'var(--amber)' }}>&gt;10 claims/hr</strong> are monitored ·
          <strong style={{ color: 'var(--red)' }}> &gt;30 claims/hr</strong> = syndicate flagged and blocked ·
          KMeans spatial clustering runs on every trigger cycle
        </div>
      </div>

      {/* Last refresh */}
      {s?.generated_at && (
        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: 'var(--text-muted)' }}>
          Last refreshed: {new Date(s.generated_at).toLocaleTimeString('en-IN')} · PostgreSQL live data
        </div>
      )}
    </div>
  );
}
