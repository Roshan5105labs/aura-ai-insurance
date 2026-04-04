import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../App';
import { apiOnboard, apiLogin } from '../mock/api';
import { ArrowRight, Shield, Zap, TrendingUp, LogIn } from 'lucide-react';

const STEPS = ['Profile', 'Work Details', 'ML Risk', 'Activate'];
const CITIES = ['Mumbai', 'Delhi', 'Chennai'];

export default function Onboarding() {
  const [isLogin, setIsLogin] = useState(false);
  const [step, setStep]     = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError]   = useState('');
  const [form, setForm]     = useState({
    name: '', password: '', phone: '', riderId: '', platform: 'Swiggy', zone: '', city: 'Mumbai',
    avg_daily_earnings: 800,
    hours_per_week: 48, vehicle_age_yrs: 2,
    past_claims: 0, gig_tenure_yrs: 1,
  });
  const { setWorker } = useContext(AppContext);
  const navigate = useNavigate();

  const set = (e) => { setError(''); setForm(f => ({ ...f, [e.target.name]: e.target.value })); };

  const handleNext = async () => {
    if (step === 1) {
      setLoading(true); setError('');
      try {
        const res = await apiOnboard(form);
        setResult(res);
      } catch (e) {
        setError(e.message || 'Something went wrong.'); setLoading(false); return;
      }
      setLoading(false);
    }
    setStep(s => s + 1);
  };

  const handleActivate = () => {
    setWorker({ ...form, ...result });
    navigate('/dashboard');
  };

  const handleLogin = async () => {
    setLoading(true); setError('');
    try {
      const res = await apiLogin({ name: form.name, phone: form.phone, password: form.password });
      setWorker({ ...form, ...res });
      navigate('/dashboard');
    } catch (e) {
      setError(e.message || 'Login failed.'); setLoading(false); return;
    }
    setLoading(false);
  };

  const riskColor = result?.risk_bucket === 'Low' ? 'var(--teal)' : result?.risk_bucket === 'Medium' ? 'var(--amber)' : 'var(--red)';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--bg-deep)' }}>
      <div style={{ position: 'fixed', top: '20%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 400, background: 'radial-gradient(ellipse, rgba(0,210,140,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 540 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }} className="fade-up">
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 42, fontWeight: 800, color: 'var(--teal)', letterSpacing: '-0.04em' }}>AURA</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 6 }}>AI-Powered Parametric Insurance · Gig Workers</div>
        </div>

        {/* Step indicator */}
        {!isLogin && (
          <div className="steps fade-up fade-up-1">
            {STEPS.map((s, i) => (
              <div key={s} className={`step ${i === step ? 'active' : i < step ? 'done' : ''}`}>
                <div className="step-num">{i < step ? '✓' : i + 1}</div>
                <div className="step-label">{s}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── Login View ── */}
        {isLogin && (
          <div className="card fade-up fade-up-2">
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Rider Login</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>Welcome back to Aura Insurance.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <label>Full Name</label>
                <input className="input" name="name" value={form.name} onChange={set} placeholder="e.g. Vikram Kumar" />
              </div>
              <div>
                <label>Password</label>
                <input className="input" name="password" type="password" value={form.password} onChange={set} placeholder="Enter your password" />
              </div>
              <div>
                <label>Phone Number</label>
                <input className="input" name="phone" type="tel" value={form.phone} onChange={set} placeholder="e.g. +91 98765 43210" />
              </div>
            </div>
            {error && (
              <div style={{ marginTop: 16, padding: '10px 14px', background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, fontSize: 13, color: 'var(--red)' }}>
                ⚠️ {error}
              </div>
            )}
            <button className="btn btn-primary" style={{ width: '100%', marginTop: 28, justifyContent: 'center' }} onClick={handleLogin} disabled={loading || !form.name || !form.password}>
              {loading ? <div className="spinner" /> : <>Log In <LogIn size={16} /></>}
            </button>
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <button className="btn btn-ghost" onClick={() => { setIsLogin(false); setError(''); }} style={{ display: 'inline-flex', padding: '6px 12px' }}>
                New Rider? Register Here
              </button>
            </div>
          </div>
        )}

        {/* ── Step 0: Profile ── */}
        {!isLogin && step === 0 && (
          <div className="card fade-up fade-up-2">
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Rider Registration</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>Create your Swiggy partner insurance account.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <label>Full Name</label>
                <input className="input" name="name" value={form.name} onChange={set} placeholder="e.g. Vikram Kumar" />
              </div>
              <div>
                <label>Password</label>
                <input className="input" name="password" type="password" value={form.password} onChange={set} placeholder="Create a password" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label>Phone Number</label>
                  <input className="input" name="phone" type="tel" value={form.phone} onChange={set} placeholder="e.g. +91 98765 43210" />
                </div>
                <div>
                  <label>Swiggy Rider ID</label>
                  <input className="input" name="riderId" value={form.riderId} onChange={set} placeholder="e.g. SW-8472" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label>City</label>
                  <select className="input" name="city" value={form.city} onChange={set}>
                    {CITIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label>Zone / Area</label>
                  <input className="input" name="zone" value={form.zone} onChange={set} placeholder="e.g. Dadar" />
                </div>
              </div>
              <div>
                <label>Average Daily Earnings (₹)</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontFamily: 'var(--font-display)', fontWeight: 600 }}>₹</span>
                  <input className="input" type="number" name="avg_daily_earnings" value={form.avg_daily_earnings} onChange={set} style={{ paddingLeft: 36 }} />
                </div>
              </div>
            </div>
            <button className="btn btn-primary" style={{ width: '100%', marginTop: 28, justifyContent: 'center' }} onClick={handleNext} disabled={!form.name || !form.password || !form.phone || !form.riderId || !form.zone}>
              Continue <ArrowRight size={16} />
            </button>
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <button className="btn btn-ghost" onClick={() => { setIsLogin(true); setError(''); }} style={{ display: 'inline-flex', padding: '6px 12px' }}>
                Existing Rider? Log In Instead
              </button>
            </div>
          </div>
        )}

        {/* ── Step 1: ML Work Details ── */}
        {!isLogin && step === 1 && (
          <div className="card fade-up fade-up-2">
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Work &amp; Vehicle Details</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 6 }}>Used by the AI model to calculate your personalized premium.</p>
            <div style={{ fontSize: 12, color: 'var(--teal)', background: 'var(--teal-glow)', border: '1px solid var(--border-accent)', borderRadius: 8, padding: '8px 12px', marginBottom: 20 }}>
              🤖 Powered by XGBoost + RandomForest + Logistic Regression ensemble
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label>Hours / Week</label>
                <input className="input" type="number" name="hours_per_week" value={form.hours_per_week} onChange={set} placeholder="48" />
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Your avg weekly working hours</div>
              </div>
              <div>
                <label>Vehicle Age (years)</label>
                <input className="input" type="number" name="vehicle_age_yrs" value={form.vehicle_age_yrs} onChange={set} step="0.5" placeholder="2" />
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Age of your bike / vehicle</div>
              </div>
              <div>
                <label>Past Claims (12 months)</label>
                <select className="input" name="past_claims" value={form.past_claims} onChange={set}>
                  {[0,1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Claims filed in past year</div>
              </div>
              <div>
                <label>Gig Tenure (years)</label>
                <input className="input" type="number" name="gig_tenure_yrs" value={form.gig_tenure_yrs} onChange={set} step="0.5" placeholder="1" />
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Years as delivery partner</div>
              </div>
            </div>

            {error && (
              <div style={{ marginTop: 16, padding: '10px 14px', background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, fontSize: 13, color: 'var(--red)' }}>
                ⚠️ {error}
              </div>
            )}
            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button className="btn btn-ghost" onClick={() => setStep(0)}>Back</button>
              <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={handleNext} disabled={loading}>
                {loading ? <><div className="spinner" /> Running AI Model…</> : <>Calculate Premium <ArrowRight size={16} /></>}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: ML Result ── */}
        {!isLogin && step === 2 && result && (
          <div className="card fade-up fade-up-2">
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--teal-glow)', border: '2px solid var(--border-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', fontSize: 26 }}>🤖</div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700 }}>AI Assessment Complete</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>VotingClassifier (XGB + RF + LR) has scored your profile</p>
            </div>

            {/* Risk meter */}
            <div style={{ background: 'var(--bg-glass)', borderRadius: 10, padding: 18, marginBottom: 16, border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Risk Bucket</span>
                <span className="badge" style={{ background: `${riskColor}18`, color: riskColor, border: `1px solid ${riskColor}40` }}>{result.risk_bucket}</span>
              </div>
              <div className="risk-meter">
                <div className={`risk-fill ${result.risk_bucket?.toLowerCase()}`} style={{ width: `${result.risk_score * 100}%` }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Safe</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Score: {result.risk_score.toFixed(2)}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>High Risk</span>
              </div>
            </div>

            {/* Model confidence */}
            {result.confidence && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Model Confidence</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {Object.entries(result.confidence).map(([label, val]) => (
                    <div key={label} style={{ flex: 1, padding: '10px 8px', background: 'var(--bg-glass)', borderRadius: 8, border: '1px solid var(--border)', textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: label === 'Low' ? 'var(--teal)' : label === 'Medium' ? 'var(--amber)' : 'var(--red)', fontWeight: 700, marginBottom: 4 }}>{label}</div>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>{(val * 100).toFixed(1)}%</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Policy details */}
            {[
              { icon: '💰', label: 'Weekly Premium',  value: `₹${result.weekly_premium}/week` },
              { icon: '🛡️', label: 'Max Coverage',    value: `₹${result.coverage_amount.toLocaleString()}` },
              { icon: '📍', label: 'Zone',            value: `${form.zone}, ${form.city} · ${form.platform}` },
              { icon: '📅', label: 'Coverage Period', value: '7 days · auto-renewable' },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: '1px solid var(--border)', fontSize: 14 }}>
                <span style={{ color: 'var(--text-secondary)' }}>{row.icon} {row.label}</span>
                <span style={{ fontWeight: 600, fontFamily: 'var(--font-display)', fontSize: 13 }}>{row.value}</span>
              </div>
            ))}

            <div style={{ background: 'var(--teal-glow)', border: '1px solid var(--border-accent)', borderRadius: 8, padding: 12, margin: '16px 0', fontSize: 13, color: 'var(--teal)' }}>
              ⚡ Stackable parametric payouts — up to ₹2,000 when multiple triggers fire simultaneously
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-ghost" onClick={() => setStep(1)}>Back</button>
              <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', fontSize: 15, padding: '14px 24px' }} onClick={() => setStep(3)}>
                Review &amp; Activate <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Activate ── */}
        {!isLogin && step === 3 && result && (
          <div className="card fade-up fade-up-2">
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>🛡️</div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700 }}>Ready to Activate</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>Your policy covers income loss only from external disruptions</p>
            </div>

            <div style={{ background: 'var(--bg-glass)', borderRadius: 10, padding: 16, marginBottom: 20, border: '1px solid var(--border)' }}>
              {[
                ['Worker', form.name],
                ['Platform', `${form.platform} · ${form.zone}, ${form.city}`],
                ['Risk Level', result.risk_bucket],
                ['Weekly Premium', `₹${result.weekly_premium}`],
                ['Max Payout/Week', `₹${result.coverage_amount.toLocaleString()}`],
                ['Stackable Triggers', '5 (Rain + AQI + Wind + Zone + Social)'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--border)', fontSize: 14 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{k}</span>
                  <span style={{ fontWeight: 600 }}>{v}</span>
                </div>
              ))}
            </div>

            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20, padding: '10px 14px', background: 'var(--bg-glass)', borderRadius: 8, border: '1px solid var(--border)' }}>
              ✅ Coverage is for <strong style={{ color: 'var(--text-primary)' }}>loss of income only</strong>. Excludes: health, life, vehicle repairs, accidents.
            </div>

            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', fontSize: 16, padding: '16px 24px' }} onClick={handleActivate}>
              Activate · Pay ₹{result.weekly_premium} via UPI <ArrowRight size={18} />
            </button>
            <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', marginTop: 10 }} onClick={() => setStep(2)}>Back</button>
          </div>
        )}

        {/* Feature pills on step 0 */}
        {!isLogin && step === 0 && (
          <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap', justifyContent: 'center' }} className="fade-up fade-up-3">
            {[
              { icon: <Zap size={14} />, text: 'Stackable payouts up to ₹2,000' },
              { icon: <Shield size={14} />, text: 'ML fraud detection' },
              { icon: <TrendingUp size={14} />, text: 'XGBoost pricing engine' },
            ].map(f => (
              <div key={f.text} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: 20, fontSize: 13, color: 'var(--text-secondary)' }}>
                <span style={{ color: 'var(--teal)' }}>{f.icon}</span> {f.text}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
