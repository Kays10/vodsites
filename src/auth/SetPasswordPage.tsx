import { useState, FormEvent } from 'react';
import { useAuth } from './AuthContext';

export default function SetPasswordPage() {
  const { setPassword } = useAuth();
  const [password, setPasswordVal] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await setPassword(password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card" role="main" aria-label="Set your password">
        <div className="login-header">
          <img src="/logo.svg" alt="VOD GROUP" className="login-logo-img" />
          <p className="login-subtitle">Set your password</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <p style={{ margin: '0 0 16px', fontSize: '0.875rem', color: '#6b7280' }}>
            Welcome! Please create a password for your account. You'll use it to sign in next time.
          </p>

          {error && <div className="login-alert" role="alert">{error}</div>}

          <div className="form-group">
            <label htmlFor="new-password">New Password</label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPasswordVal(e.target.value)}
              placeholder="At least 8 characters"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirm-password">Confirm Password</label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat your password"
              required
            />
          </div>

          <button type="submit" className="btn btn-primary btn-login" disabled={loading}>
            {loading ? 'Saving...' : 'Set Password & Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
