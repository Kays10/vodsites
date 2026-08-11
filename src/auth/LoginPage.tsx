import { useState, FormEvent } from 'react';
import { useAuth } from './AuthContext';

export default function LoginPage() {
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    const trimmed = forgotEmail.trim().toLowerCase();
    if (!trimmed) { setForgotError('Please enter your email address.'); return; }
    if (!trimmed.endsWith('@vodgroup.co.za')) { setForgotError('Only @vodgroup.co.za addresses are allowed.'); return; }
    setForgotLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setForgotError(data?.error || 'Failed to send reset link.'); }
      else { setForgotSent(true); }
    } catch {
      setForgotError('Network error. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card" role="main" aria-label="VOD Group Sign In">
        <div className="login-header">
          <img src="/logo.svg" alt="VOD Group" className="login-logo-img" />
          <p className="login-subtitle">Sign in to access your sites</p>
        </div>

        {showForgot ? (
          <div className="login-form">
            <h3 style={{ margin: '0 0 12px', fontSize: '1rem', fontWeight: 600 }}>Reset your password</h3>
            {forgotSent ? (
              <div className="login-alert login-alert-success" role="status">
                Reset link sent — check your inbox at <strong>{forgotEmail}</strong>.
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} noValidate>
                {forgotError && <div className="login-alert" role="alert">{forgotError}</div>}
                <div className="form-group">
                  <label htmlFor="forgot-email">Email</label>
                  <input
                    id="forgot-email" type="email" autoComplete="email"
                    value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                    placeholder="you@vodgroup.co.za" required autoFocus
                  />
                </div>
                <button type="submit" className="btn btn-primary btn-login" disabled={forgotLoading}>
                  {forgotLoading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
            )}
            <button className="login-link-btn" onClick={() => { setShowForgot(false); setForgotSent(false); setForgotEmail(''); setForgotError(null); }}>
              ← Back to sign in
            </button>
          </div>
        ) : (
          <form className="login-form" onSubmit={handleLogin} noValidate>
            {error && <div className="login-alert" role="alert">{error}</div>}
            <div className="form-group">
              <label htmlFor="login-email">Email</label>
              <input
                id="login-email" type="email" autoComplete="email"
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@vodgroup.co.za" required autoFocus
              />
            </div>
            <div className="form-group">
              <label htmlFor="login-password">Password</label>
              <input
                id="login-password" type="password" autoComplete="current-password"
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Enter password" required
              />
            </div>
            <button type="submit" className="btn btn-primary btn-login" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
            <button type="button" className="login-link-btn" onClick={() => { setShowForgot(true); setForgotEmail(email); }}>
              Forgot password?
            </button>
            <p className="login-footer-note">Need access? Contact your administrator.</p>
          </form>
        )}
      </div>
    </div>
  );
}
