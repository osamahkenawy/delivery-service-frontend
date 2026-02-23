import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeClosed, WarningTriangle } from 'iconoir-react';
import { AuthContext } from '../App';
import './LoginPage.css';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const { login } = useContext(AuthContext);
  const navigate  = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login(username, password);
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.message || 'Invalid credentials. Please try again.');
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-left">
        <div className="login-content">
          <div className="login-header">
            <div className="logo">
              <img
                src="/assets/images/logos/full_logo_colored.png"
                alt="Trasealla Delivery"
                onError={e => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'block';
                }}
              />
              <span style={{ display: 'none', fontSize: 28, fontWeight: 800, color: '#244066' }}>
                Trasealla
              </span>
            </div>
          </div>

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
                <label>Password</label>
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
                {loading ? 'Signing in\u2026' : 'Sign In'}
              </button>
            </form>
          </div>

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
