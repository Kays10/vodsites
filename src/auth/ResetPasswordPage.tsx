import { useState, FormEvent } from 'react';
import { useAuth } from './AuthContext';

export default function ResetPasswordPage() {
  const { resetPassword, clearPending, pendingType } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const isInvite = pendingType === 'invite';
  const title = isInvite ? 'Set your password' : 'Reset your password';
  const intro = isInvite
    ? 'Welcome! Create a password for your account. You\'ll use it every time you sign in.'
    : 'Enter a new password for your account.';
  const btnLabel = isInvite ? 'Set Password & Continue' : 'Set New Password';

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
      await resetPassword(password);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card" role="main">
        <div className="login-header">
          <img src="/logo.svg" alt="VOD GROUP" className="login-logo-img" />
          <p className="login-subtitle">{title}</p>
        </div>

        {done ? (
          <div className="login-form">
            <div className="login-alert login-alert-success" role="status">
              {isInvite
                ? 'Password set. You can now sign in.'
                : 'Password updated. You can now sign in with your new password.'}
            </div>
            <button
              className="btn btn-primary btn-login"
              style={{ marginTop: 12 }}
              onClick={clearPending}
            >
              Go to Sign In
            </button>
          </div>
        ) : (
          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <p style={{ margin: '0 0 16px', fontSize: '0.875rem', color: '#6b7280' }}>{intro}</p>

            {error && <div className="login-alert" role="alert">{error}</div>}

            <div className="form-group">
              <label htmlFor="rp-password">New Password</label>
              <input
                id="rp-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label htmlFor="rp-confirm">Confirm Password</label>
              <input
                id="rp-confirm"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Repeat your password"
                required
              />
            </div>

            <button type="submit" className="btn btn-primary btn-login" disabled={loading}>
              {loading ? 'Saving...' : btnLabel}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
