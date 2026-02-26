import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Eye, EyeClosed, WarningTriangle, Mail, ArrowLeft, CheckCircle } from 'iconoir-react';
import { AuthContext } from '../App';
import './LoginPage.css';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export default function LoginPage() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
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
        setError(result.message || t('auth.invalid_credentials'));
      }
    } catch {
      setError(t('auth.error_occurred'));
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
        setFpError(data.message || t('auth.something_wrong'));
      }
    } catch {
      setFpError(t('auth.network_error'));
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
              <h1>{t('auth.welcome_title')}</h1>
              <p className="lp-subtitle">{t('auth.welcome_subtitle')}</p>

              <form onSubmit={handleSubmit} className="login-form">
                {error && (
                  <div className="lp-error">
                    <WarningTriangle width={16} height={16} />&nbsp;{error}
                  </div>
                )}

                <div className="lp-field">
                  <label>{t('auth.username_or_email')}</label>
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder={t('auth.username_placeholder')}
                    autoComplete="username"
                    required
                  />
                </div>

                <div className="lp-field">
                  <div className="lp-field-row" style={{ marginBottom: 6 }}>
                    <label style={{ margin: 0 }}>{t('auth.password')}</label>
                    <button type="button" className="lp-forgot-link" onClick={() => { setView('forgot'); setFpError(''); }}>
                      {t('auth.forgot_password_link')}
                    </button>
                  </div>
                  <div className="lp-pw-wrap">
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder={t('auth.password_placeholder')}
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
                  {loading ? t('auth.signing_in') : t('auth.sign_in')}
                </button>
              </form>
            </div>
          )}

          {/* ── FORGOT PASSWORD VIEW ── */}
          {view === 'forgot' && (
            <div className="lp-view lp-view-enter">
              <button type="button" className="lp-back-view" onClick={() => setView('login')}>
                <ArrowLeft width={14} height={14} /> {t('auth.back_to_sign_in')}
              </button>

              <div className="lp-fp-icon">
                <Mail width={26} height={26} />
              </div>
              <h1 style={{ marginBottom: 8 }}>{t('auth.forgot_password_title')}</h1>
              <p className="lp-subtitle">{t('auth.forgot_password_subtitle')}</p>

              <form onSubmit={handleForgot} className="login-form" style={{ marginTop: 24 }}>
                {fpError && (
                  <div className="lp-error">
                    <WarningTriangle width={16} height={16} />&nbsp;{fpError}
                  </div>
                )}
                <div className="lp-field">
                  <label>{t('auth.email_address')}</label>
                  <input
                    type="email"
                    value={fpEmail}
                    onChange={e => setFpEmail(e.target.value)}
                    placeholder={t('auth.email_placeholder')}
                    autoComplete="email"
                    required
                  />
                </div>
                <button type="submit" className="lp-btn-primary" disabled={fpLoading}>
                  {fpLoading ? <span className="lp-spinner" /> : null}
                  {fpLoading ? t('auth.sending') : t('auth.send_reset_link')}
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
              <h1 style={{ marginBottom: 8 }}>{t('auth.check_inbox')}</h1>
              <p className="lp-subtitle" style={{ marginBottom: 20 }}
                dangerouslySetInnerHTML={{ __html: t('auth.check_inbox_desc', { email: fpEmail }) }}
              />
              <div className="lp-sent-tips">
                <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: 13, color: '#374151' }}>{t('auth.didnt_get_email')}</p>
                <ul style={{ margin: 0, padding: '0 0 0 18px', fontSize: 13, color: '#64748b', lineHeight: 1.8 }}>
                  <li>{t('auth.check_spam')}</li>
                  <li>{t('auth.check_correct_email')}</li>
                  <li>{t('auth.link_expires')}</li>
                </ul>
              </div>
              <button
                type="button"
                className="lp-btn-primary"
                style={{ marginTop: 20 }}
                onClick={() => { setView('login'); setFpEmail(''); }}
              >
                {t('auth.back_to_sign_in')}
              </button>
              <button
                type="button"
                className="lp-back-view"
                style={{ marginTop: 12 }}
                onClick={() => { setView('forgot'); setFpError(''); }}
              >
                {t('auth.try_different_email')}
              </button>
            </div>
          )}

          <p style={{ textAlign: 'center', marginTop: '1.5rem', color: '#94a3b8', fontSize: '0.85rem' }}>
            {t('auth.platform_admin')}{' '}
            <a href="/super-admin/login" style={{ color: '#f2421b', fontWeight: 600 }}>
              {t('auth.super_admin_login')} &rarr;
            </a>
          </p>
        </div>
      </div>

      <div className="login-right" aria-hidden="true" />
    </div>
  );
}
