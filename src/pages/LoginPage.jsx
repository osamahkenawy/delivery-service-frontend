import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeClosed, WarningTriangle, Mail, ArrowLeft, CheckCircle } from 'iconoir-react';
import { AuthContext } from '../App';
import './LoginPage.css';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export default function LoginPage() {
  /* ── Login state ── */
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  /* ── Forgot-password state ── */
  const [view,     setView]     = useState('login'); // 'login' | 'forgot' | 'sent'
  const [fpEmail,  setFpEmail]  = useState('');
  const [fpLoading,setFpLoading]= useState(false);
  const [fpError,  setFpError]  = useState('');

  const { login } = useContext(AuthContext);
  const navigate  = useNavigate();

  /* ── Login submit ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login(username, password);
      if (result.success) {
        navigate(result.role === 'driver' ? '/driver/orders' : '/dashboard');
      } else {
        setError(result.message || 'Invalid credentials. Please try again.');
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /* ── Forgot-password submit ── */
  const handleForgot = async (e) => {
    e.preventDefault();
    setFpError('');
    setFpLoading(true);
    try {
      const res  = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: fpEmail }),
      });
      const data = await res.json();
      if (data.success) {
        setView('sent');
      } else {
        setFpError(data.message || 'Something went wrong. Please try again.');
      }
    } catch {
      setFpError('Network error. Please try again.');
    } finally {
      setFpLoading(false);
    }
  };

  const Logo = () => (
    <div className="login-header">
      <div className="logo">
        <img
          src="/assets/images/logos/full_logo_colored.png"
          alt="Trasealla Delivery"
          onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
        />
        <span style={{ display: 'none', fontSize: 28, fontWeight: 800, color: '#244066' }}>Trasealla</span>
      </div>
    </div>
  );

  return (
    <div className="login-page">
      <div className="login-left">
        <div className="login-content">
          <Logo />

          {/* ── LOGIN VIEW ── */}
          {view === 'login' && (
            <div className="lp-view lp-view-enter">
              <h1>Welcome To Go Line</h1>
              <p className="lp-subtitle">Sign in to your Delivery Management account</p>

              <form onSubmit={handleSubmit} className="login-form">
                {error && (
                  <div className="lp-error">
                    <WarningTriangle width={16} height={16} />&nbsp;{error}
                  </div>
                )}

                <div className="lp-field">
                  <label>Username or Email</label>
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="Enter your username or email"
                    autoComplete="username"
                    required
                  />
                </div>

                <div className="lp-field">
                  <div className="lp-field-row" style={{ marginBottom: 6 }}>
                    <label style={{ margin: 0 }}>Password</label>
                    <button type="button" className="lp-forgot-link" onClick={() => { setView('forgot'); setFpError(''); }}>
                      Forgot password?
                    </button>
                  </div>
                  <div className="lp-pw-wrap">
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      required
                    />
                    <button type="button" className="lp-pw-eye" onClick={() => setShowPw(p => !p)}>
                      {showPw ? <EyeClosed width={16} height={16} /> : <Eye width={16} height={16} />}
                    </button>
                  </div>
                </div>

                <button type="submit" className="lp-btn-primary" disabled={loading}>
                  {loading ? <span className="lp-spinner" /> : null}
                  {loading ? 'Signing in…' : 'Sign In'}
                </button>
              </form>
            </div>
          )}

          {/* ── FORGOT PASSWORD VIEW ── */}
          {view === 'forgot' && (
            <div className="lp-view lp-view-enter">
              <button type="button" className="lp-back-view" onClick={() => setView('login')}>
                <ArrowLeft width={14} height={14} /> Back to Sign In
              </button>

              <div className="lp-fp-icon">
                <Mail width={26} height={26} />
              </div>
              <h1 style={{ marginBottom: 8 }}>Forgot Password?</h1>
              <p className="lp-subtitle">Enter your email and we'll send you a reset link.</p>

              <form onSubmit={handleForgot} className="login-form" style={{ marginTop: 24 }}>
                {fpError && (
                  <div className="lp-error">
                    <WarningTriangle width={16} height={16} />&nbsp;{fpError}
                  </div>
                )}
                <div className="lp-field">
                  <label>Email Address</label>
                  <input
                    type="email"
                    value={fpEmail}
                    onChange={e => setFpEmail(e.target.value)}
                    placeholder="your@email.com"
                    autoComplete="email"
                    required
                  />
                </div>
                <button type="submit" className="lp-btn-primary" disabled={fpLoading}>
                  {fpLoading ? <span className="lp-spinner" /> : null}
                  {fpLoading ? 'Sending…' : 'Send Reset Link'}
                </button>
              </form>
            </div>
          )}

          {/* ── SENT VIEW ── */}
          {view === 'sent' && (
            <div className="lp-view lp-view-enter lp-sent-view">
              <div className="lp-sent-icon">
                <CheckCircle width={32} height={32} />
              </div>
              <h1 style={{ marginBottom: 8 }}>Check your inbox</h1>
              <p className="lp-subtitle" style={{ marginBottom: 20 }}>
                If <strong>{fpEmail}</strong> is registered, you'll receive a password reset link shortly.
              </p>
              <div className="lp-sent-tips">
                <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: 13, color: '#374151' }}>Didn't get an email?</p>
                <ul style={{ margin: 0, padding: '0 0 0 18px', fontSize: 13, color: '#64748b', lineHeight: 1.8 }}>
                  <li>Check your spam or junk folder</li>
                  <li>Make sure you entered the correct email</li>
                  <li>The link expires in 1 hour</li>
                </ul>
              </div>
              <button
                type="button"
                className="lp-btn-primary"
                style={{ marginTop: 20 }}
                onClick={() => { setView('login'); setFpEmail(''); }}
              >
                Back to Sign In
              </button>
              <button
                type="button"
                className="lp-back-view"
                style={{ marginTop: 12 }}
                onClick={() => { setView('forgot'); setFpError(''); }}
              >
                Try a different email
              </button>
            </div>
          )}

          <p style={{ textAlign: 'center', marginTop: '1.5rem', color: '#94a3b8', fontSize: '0.85rem' }}>
            Platform administrator?{' '}
            <a href="/super-admin/login" style={{ color: '#f2421b', fontWeight: 600 }}>
              Super Admin Login &rarr;
            </a>
          </p>
        </div>
      </div>

      <div className="login-right" aria-hidden="true" />
    </div>
  );
}
