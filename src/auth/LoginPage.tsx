import { useState, FormEvent } from 'react';
import { useAuth } from './AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setError(null);
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (err) {
      const msg =
        err instanceof Error && err.message && err.message.trim()
          ? err.message
          : 'Login failed. Please try again.';
      setError(msg);
    } finally {
      try {
        setLoading(false);
      } catch {
        setLoading(false);
      }
    }
  };

  return (
    <div className="login-page">
      <div className="login-card" role="main" aria-label="VOD GROUP Sign In">
        <div className="login-header">
          <img src="/logo.svg" alt="VOD GROUP" className="login-logo-img" />
          <p className="login-subtitle">Sign in to access your sites</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          {error && (
            <div className="login-alert" role="alert">
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
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
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  void handleSubmit(e);
                }
              }}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-login"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <p className="login-footer-note">
            Need access? Contact your administrator to create an account.
          </p>
        </form>
      </div>
    </div>
  );
}
