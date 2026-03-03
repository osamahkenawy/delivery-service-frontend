/* ══════════════════════════════════════════════════════════════
 * ClientLogin.jsx — Merchant Portal Login Page
 * Route: /merchant/login
 * ══════════════════════════════════════════════════════════════ */
import { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Eye, EyeClosed, Mail, Language, WarningTriangle } from 'iconoir-react';
import { AuthContext } from '../../App';
import './ClientAuth.css';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export default function ClientLogin() {
  const { t, i18n } = useTranslation();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [unverified, setUnverified] = useState(false);

  // Forgot password state
  const [view, setView]         = useState('login'); // login | forgot | sent
  const [fpEmail, setFpEmail]   = useState('');
  const [fpLoading, setFpLoading] = useState(false);
  const [fpError, setFpError]   = useState('');

  // Branding
  const [branding, setBranding] = useState(null);
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/auth/branding`);
        const data = await res.json();
        if (data.success && data.data) setBranding(data.data);
      } catch { /* fallback */ }
    })();
  }, []);

  // If already logged in as client, redirect
  useEffect(() => {
    if (user && user.role === 'client') navigate('/merchant/dashboard');
  }, [user, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setUnverified(false);
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/client-portal/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.success) {
        const token = data.data.token;
        localStorage.setItem('crm_token', token);
        localStorage.setItem('crm_user', JSON.stringify(data.data));
        if (data.data.tenant) {
          localStorage.setItem('crm_tenant', JSON.stringify(data.data.tenant));
        }
        window.location.href = '/merchant/dashboard';
      } else {
        if (data.code === 'EMAIL_NOT_VERIFIED') {
          setUnverified(true);
        }
        setError(data.message || 'Login failed');
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setFpError('');
    setFpLoading(true);
    try {
      const res = await fetch(`${API_URL}/client-portal/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: fpEmail }),
      });
      const data = await res.json();
      if (data.success) setView('sent');
      else setFpError(data.message);
    } catch { setFpError('Network error'); } finally { setFpLoading(false); }
  };

  const logoUrl = branding?.logo_url
    ? '/api/file?path=' + encodeURIComponent(branding.logo_url.replace(/^\/uploads\//, ''))
    : '/assets/images/logos/trasealla_with_bg.jpg';

  return (
    <div className="ca-page">
      <div className="ca-left">
        {/* LOGO */}
        <div className="ca-logo-box">
          <img src={logoUrl} alt={branding?.name || 'Trasealla'} className="ca-logo" />
        </div>

        {view === 'login' && (
          <form className="ca-form" onSubmit={handleLogin}>
            <h1 className="ca-title">{t('merchant.login_title', 'Merchant Portal')}</h1>
            <p className="ca-subtitle">{t('merchant.login_subtitle', 'Sign in to manage your shipments')}</p>

            {error && (
              <div className="ca-alert ca-alert-error">
                <WarningTriangle width={16} height={16} />
                <span>{error}</span>
              </div>
            )}
            {unverified && (
              <div className="ca-alert ca-alert-warning">
                <Mail width={16} height={16} />
                <span>{t('merchant.verify_email_prompt', 'Please verify your email. Check your inbox.')}</span>
              </div>
            )}

            <label className="ca-label">{t('merchant.email', 'Email or Phone')}</label>
            <input
              className="ca-input"
              type="text"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="merchant@company.com"
              required
              autoFocus
            />

            <label className="ca-label">{t('merchant.password', 'Password')}</label>
            <div className="ca-input-group">
              <input
                className="ca-input"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
              <button type="button" className="ca-toggle-pw" onClick={() => setShowPw(p => !p)}>
                {showPw ? <EyeClosed width={18} height={18} /> : <Eye width={18} height={18} />}
              </button>
            </div>

            <div className="ca-row" style={{ justifyContent: 'flex-end', marginBottom: 16 }}>
              <button type="button" className="ca-link" onClick={() => { setView('forgot'); setFpEmail(email); }}>
                {t('merchant.forgot_password', 'Forgot password?')}
              </button>
            </div>

            <button type="submit" className="ca-btn ca-btn-primary" disabled={loading}>
              {loading ? <span className="ca-spinner" /> : t('merchant.sign_in', 'Sign In')}
            </button>

            <p className="ca-footer-text">
              {t('merchant.no_account', "Don't have an account?")}{' '}
              <Link to="/merchant/register" className="ca-link">{t('merchant.register_now', 'Register Now')}</Link>
            </p>

            <div className="ca-divider" />
            <p className="ca-footer-text" style={{ fontSize: 12, opacity: 0.6 }}>
              <Link to="/login" className="ca-link">{t('merchant.admin_login', 'Admin / Staff Login')}</Link>
            </p>
          </form>
        )}

        {view === 'forgot' && (
          <form className="ca-form" onSubmit={handleForgot}>
            <h1 className="ca-title">{t('merchant.reset_title', 'Reset Password')}</h1>
            <p className="ca-subtitle">{t('merchant.reset_subtitle', "Enter your email and we'll send a reset link")}</p>

            {fpError && (
              <div className="ca-alert ca-alert-error"><WarningTriangle width={16} height={16} /><span>{fpError}</span></div>
            )}

            <label className="ca-label">Email</label>
            <input className="ca-input" type="email" value={fpEmail} onChange={e => setFpEmail(e.target.value)} placeholder="merchant@company.com" required autoFocus />

            <button type="submit" className="ca-btn ca-btn-primary" disabled={fpLoading}>
              {fpLoading ? <span className="ca-spinner" /> : t('merchant.send_reset', 'Send Reset Link')}
            </button>

            <button type="button" className="ca-link" style={{ marginTop: 16, textAlign: 'center', display: 'block' }} onClick={() => setView('login')}>
              {t('merchant.back_to_login', 'Back to Login')}
            </button>
          </form>
        )}

        {view === 'sent' && (
          <div className="ca-form" style={{ textAlign: 'center' }}>
            <div className="ca-success-icon">✉️</div>
            <h1 className="ca-title">{t('merchant.check_email', 'Check Your Email')}</h1>
            <p className="ca-subtitle">{t('merchant.reset_sent', "If that email is registered, you'll receive a reset link shortly.")}</p>
            <button type="button" className="ca-btn ca-btn-outline" onClick={() => setView('login')}>
              {t('merchant.back_to_login', 'Back to Login')}
            </button>
          </div>
        )}
      </div>

      <div className="ca-right">
        <div className="ca-hero-content">
          <div className="ca-hero-badge">Merchant Portal</div>
          <h2 className="ca-hero-title">{t('merchant.hero_title', 'Ship Smarter, Grow Faster')}</h2>
          <p className="ca-hero-text">{t('merchant.hero_text', 'Create orders, print labels, track shipments, and manage invoices — all from one place.')}</p>
          <div className="ca-hero-features">
            <div className="ca-hero-feature"><span className="ca-feature-icon">📦</span> Create & track orders</div>
            <div className="ca-hero-feature"><span className="ca-feature-icon">🏷️</span> Print shipping labels</div>
            <div className="ca-hero-feature"><span className="ca-feature-icon">📊</span> Real-time dashboard</div>
            <div className="ca-hero-feature"><span className="ca-feature-icon">💰</span> COD & invoice management</div>
          </div>
        </div>
      </div>
    </div>
  );
}
