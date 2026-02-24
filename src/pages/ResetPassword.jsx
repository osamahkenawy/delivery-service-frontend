import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeClosed, WarningTriangle, CheckCircle, Key } from 'iconoir-react';
import './LoginPage.css';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export default function ResetPassword() {
  const [searchParams]          = useSearchParams();
  const token                   = searchParams.get('token');
  const navigate                = useNavigate();

  const [password,    setPassword]    = useState('');
  const [confirm,     setConfirm]     = useState('');
  const [showPw,      setShowPw]      = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [done,        setDone]        = useState(false);

  /* Validate token presence */
  useEffect(() => {
    if (!token) setError('Missing or invalid reset link. Please request a new one.');
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 6)  { setError('Password must be at least 6 characters.'); return; }

    setError('');
    setLoading(true);
    try {
      const res  = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: password }),
      });
      const data = await res.json();
      if (data.success) {
        setDone(true);
      } else {
        setError(data.message || 'Reset failed. The link may have expired — please request a new one.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /* Strength indicator */
  function strength(pw) {
    if (pw.length === 0) return null;
    let score = 0;
    if (pw.length >= 8)            score++;
    if (/[A-Z]/.test(pw))          score++;
    if (/[0-9]/.test(pw))          score++;
    if (/[^A-Za-z0-9]/.test(pw))   score++;
    if (score <= 1) return { label: 'Weak',   color: '#ef4444', width: '25%' };
    if (score === 2) return { label: 'Fair',   color: '#f97316', width: '50%' };
    if (score === 3) return { label: 'Good',   color: '#3b82f6', width: '75%' };
    return           { label: 'Strong', color: '#22c55e', width: '100%' };
  }
  const str = strength(password);

  return (
    <div className="login-page">
      <div className="login-left">
        <div className="login-content">
          <div className="login-header">
            <div className="logo">
              <img
                src="/assets/images/logos/full_logo_colored.png"
                alt="Trasealla Delivery"
                onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='block'; }}
              />
              <span style={{ display:'none', fontSize:28, fontWeight:800, color:'#244066' }}>Trasealla</span>
            </div>
          </div>

          {/* ── SUCCESS STATE ── */}
          {done ? (
            <div className="lp-view lp-view-enter lp-sent-view">
              <div className="lp-sent-icon">
                <CheckCircle width={32} height={32} />
              </div>
              <h1 style={{ marginBottom: 8 }}>Password Updated!</h1>
              <p className="lp-subtitle" style={{ marginBottom: 24 }}>
                Your password has been changed successfully. You can now sign in with your new password.
              </p>
              <button
                type="button"
                className="lp-btn-primary"
                onClick={() => navigate('/login')}
              >
                Go to Sign In
              </button>
            </div>
          ) : (
            /* ── RESET FORM ── */
            <div className="lp-view lp-view-enter">
              <div className="lp-fp-icon">
                <Key width={26} height={26} />
              </div>
              <h1 style={{ marginBottom: 8 }}>Set New Password</h1>
              <p className="lp-subtitle">Choose a strong password for your account.</p>

              <form onSubmit={handleSubmit} className="login-form" style={{ marginTop: 24 }}>
                {error && (
                  <div className="lp-error">
                    <WarningTriangle width={16} height={16} />&nbsp;{error}
                  </div>
                )}

                {/* New password */}
                <div className="lp-field">
                  <label>New Password</label>
                  <div className="lp-pw-wrap">
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      autoComplete="new-password"
                      required
                      disabled={!token}
                    />
                    <button type="button" className="lp-pw-eye" onClick={() => setShowPw(p => !p)}>
                      {showPw ? <EyeClosed width={16} height={16} /> : <Eye width={16} height={16} />}
                    </button>
                  </div>
                  {/* Strength bar */}
                  {str && (
                    <div style={{ marginTop: 6 }}>
                      <div style={{ height: 4, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: str.width, background: str.color, transition: 'width .3s, background .3s', borderRadius: 4 }} />
                      </div>
                      <p style={{ margin: '4px 0 0', fontSize: 11, color: str.color, fontWeight: 600 }}>{str.label}</p>
                    </div>
                  )}
                </div>

                {/* Confirm password */}
                <div className="lp-field">
                  <label>Confirm Password</label>
                  <div className="lp-pw-wrap">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      placeholder="Repeat your password"
                      autoComplete="new-password"
                      required
                      disabled={!token}
                      style={confirm && confirm !== password ? { borderColor: '#ef4444' } : {}}
                    />
                    <button type="button" className="lp-pw-eye" onClick={() => setShowConfirm(p => !p)}>
                      {showConfirm ? <EyeClosed width={16} height={16} /> : <Eye width={16} height={16} />}
                    </button>
                  </div>
                  {confirm && confirm !== password && (
                    <p style={{ margin: '4px 0 0', fontSize: 11, color: '#ef4444', fontWeight: 600 }}>Passwords don't match</p>
                  )}
                </div>

                <button type="submit" className="lp-btn-primary" disabled={loading || !token}>
                  {loading ? <span className="lp-spinner" /> : null}
                  {loading ? 'Saving…' : 'Set New Password'}
                </button>
              </form>

              <div style={{ textAlign:'center', marginTop:16 }}>
                <a href="/login" style={{ fontSize:13, color:'#64748b', fontWeight:600 }}>
                  &larr; Back to Sign In
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="login-right" aria-hidden="true" />
    </div>
  );
}
