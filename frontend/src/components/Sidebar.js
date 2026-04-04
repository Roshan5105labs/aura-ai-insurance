import React, { useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AppContext } from '../App';
import { LayoutDashboard, FileText, ShieldCheck, ChevronRight } from 'lucide-react';

export default function Sidebar() {
  const { view, setView, worker } = useContext(AppContext);
  const navigate  = useNavigate();
  const location  = useLocation();

  const navItems = view === 'worker' ? [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: ShieldCheck,     label: 'My Policy', path: '/policy'    },
    { icon: FileText,        label: 'Claims',     path: '/claims'    },
  ] : [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: ShieldCheck,     label: 'All Policies', path: '/admin-policies' },
    { icon: FileText,        label: 'All Claims',   path: '/admin-claims'   },
  ];

  return (
    <div className="sidebar">
      <div className="logo">
        AURA
        <span>Parametric Insurance</span>
      </div>

      <div style={{
        display: 'flex', background: 'var(--bg-glass)', borderRadius: 8,
        padding: 4, marginBottom: 16, border: '1px solid var(--border)'
      }}>
        {['worker', 'admin'].map(v => (
          <button key={v} onClick={() => { setView(v); navigate('/dashboard'); }} style={{
            flex: 1, padding: '7px 0', border: 'none', cursor: 'pointer', borderRadius: 6,
            fontSize: 12, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'capitalize',
            background: view === v ? 'var(--teal)' : 'transparent',
            color:      view === v ? '#050a0e'     : 'var(--text-secondary)',
            transition: 'all 0.2s',
          }}>
            {v === 'worker' ? '🛵 Worker' : '🛡 Admin'}
          </button>
        ))}
      </div>

      {worker && view === 'worker' && (
        <div style={{ padding: '10px 14px', background: 'var(--bg-glass)', borderRadius: 8, border: '1px solid var(--border)', marginBottom: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{worker.name}</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{worker.platform} · {worker.zone}, {worker.city}</div>
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
              Risk: <span style={{ color: worker.risk_bucket === 'Low' ? 'var(--teal)' : worker.risk_bucket === 'Medium' ? 'var(--amber)' : 'var(--red)' }}>{worker.risk_bucket}</span>
            </div>
            <div className="risk-meter">
              <div className={`risk-fill ${worker.risk_bucket?.toLowerCase()}`} style={{ width: `${(worker.risk_score ?? 0.5) * 100}%` }} />
            </div>
          </div>
        </div>
      )}

      <nav style={{ flex: 1 }}>
        {navItems.map(({ icon: Icon, label, path }) => (
          <button key={path} className={`nav-item ${location.pathname === path ? 'active' : ''}`} onClick={() => navigate(path)}>
            <Icon size={16} />
            {label}
            {location.pathname === path && <ChevronRight size={14} style={{ marginLeft: 'auto' }} />}
          </button>
        ))}
      </nav>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', paddingLeft: 14, letterSpacing: '0.06em' }}>
          PHASE 2 · GUIDEWIRE DEVTRAILS 2026
        </div>
      </div>
    </div>
  );
}
