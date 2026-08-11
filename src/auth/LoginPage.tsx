import { useState, FormEvent } from 'react';
import { useAuth } from './AuthContext';

type Tab = 'password' | 'magic';

export default function LoginPage() {
  const { login } = useAuth();
  const [tab, setTab] = useState<Tab>('password');

  // Password login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Magic link state
  const [magicEmail, setMagicEmail] = useState('');
  const [magicError, setMagicError] = useState<string | null>(null);
  const [magicLoading, setMagicLoading] = useState(false);
  const [magicSent, setMagicSent] = useState(false);

  // Forgot password state
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  const handlePasswordLogin = async (e: FormEvent) => {
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

  const handleMagicLink = async (e: FormEvent) => {
    e.preventDefault();
    setMagicError(null);
    const trimmed = magicEmail.trim().toLowerCase();
    if (!trimmed) {
      setMagicError('Please enter your email address.');
      return;
    }
    if (!trimmed.endsWith('@vodgroup.co.za')) {
      setMagicError('Only @vodgroup.co.za email addresses are allowed.');
      return;
    }
    setMagicLoading(true);
    try {
      const res = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMagicError(data?.error || 'Failed to send link. Please try again.');
      } else {
        setMagicSent(true);
      }
    } catch {
      setMagicError('Network error. Please try again.');
    } finally {
      setMagicLoading(false);
    }
  };

  const handleForgotPassword = async (e: FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    const trimmed = forgotEmail.trim().toLowerCase();
    if (!trimmed) {
      setForgotError('Please enter your email address.');
      return;
    }
    setForgotLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setForgotError(data?.error || 'Failed to send reset link.');
      } else {
        setForgotSent(true);
      }
    } catch {
      setForgotError('Network error. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card" role="main" aria-label="VOD GROUP Sign In">
        <div className="login-header">
          <img src="/logo.svg" alt="VOD GROUP" className="login-logo-img" />
          <p className="login-subtitle">Sign in to access your sites</p>
        </div>

        {/* ── Forgot password overlay ── */}
        {showForgot ? (
          <div className="login-form">
            <h3 style={{ margin: '0 0 12px', fontSize: '1rem', fontWeight: 600 }}>Reset your password</h3>
            {forgotSent ? (
              <div className="login-alert login-alert-success" role="status">
                If that email exists, a password reset link has been sent. Check your inbox.
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} noValidate>
                {forgotError && <div className="login-alert" role="alert">{forgotError}</div>}
                <div className="form-group">
                  <label htmlFor="forgot-email">Email</label>
                  <input
                    id="forgot-email"
                    type="email"
                    autoComplete="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="you@vodgroup.co.za"
                    required
                    autoFocus
                  />
                </div>
                <button type="submit" className="btn btn-primary btn-login" disabled={forgotLoading}>
                  {forgotLoading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
            )}
            <button
              className="login-link-btn"
              onClick={() => { setShowForgot(false); setForgotSent(false); setForgotEmail(''); setForgotError(null); }}
            >
              ← Back to sign in
            </button>
          </div>
        ) : (
          <>
            {/* ── Tabs ── */}
            <div className="login-tabs">
              <button
                className={`login-tab ${tab === 'password' ? 'active' : ''}`}
                onClick={() => { setTab('password'); setError(null); }}
              >
                Password
              </button>
              <button
                className={`login-tab ${tab === 'magic' ? 'active' : ''}`}
                onClick={() => { setTab('magic'); setMagicError(null); setMagicSent(false); }}
              >
                Email Link
              </button>
            </div>

            {/* ── Password tab ── */}
            {tab === 'password' && (
              <form className="login-form" onSubmit={handlePasswordLogin} noValidate>
                {error && <div className="login-alert" role="alert">{error}</div>}
                <div className="form-group">
                  <label htmlFor="login-email">Email</label>
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@vodgroup.co.za"
                    required
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="login-password">Password</label>
                  <input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary btn-login" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
                <button
                  type="button"
                  className="login-link-btn"
                  onClick={() => { setShowForgot(true); setForgotEmail(email); }}
                >
                  Forgot password?
                </button>
              </form>
            )}

            {/* ── Magic link tab ── */}
            {tab === 'magic' && (
              <div className="login-form">
                {magicSent ? (
                  <div className="login-alert login-alert-success" role="status">
                    Check your inbox — a sign-in link has been sent to <strong>{magicEmail}</strong>.
                    <br /><br />
                    Click the link in the email to sign in. No password needed.
                  </div>
                ) : (
                  <form onSubmit={handleMagicLink} noValidate>
                    {magicError && <div className="login-alert" role="alert">{magicError}</div>}
                    <p style={{ margin: '0 0 16px', fontSize: '0.875rem', color: '#6b7280' }}>
                      Enter your @vodgroup.co.za email and we'll send you a one-click sign-in link.
                    </p>
                    <div className="form-group">
                      <label htmlFor="magic-email">Email</label>
                      <input
                        id="magic-email"
                        type="email"
                        autoComplete="email"
                        value={magicEmail}
                        onChange={(e) => setMagicEmail(e.target.value)}
                        placeholder="you@vodgroup.co.za"
                        required
                        autoFocus
                      />
                    </div>
                    <button type="submit" className="btn btn-primary btn-login" disabled={magicLoading}>
                      {magicLoading ? 'Sending...' : 'Send Sign-In Link'}
                    </button>
                  </form>
                )}
              </div>
            )}

            <p className="login-footer-note">
              Need access? Contact your administrator.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
