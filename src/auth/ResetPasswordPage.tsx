import { useState, FormEvent } from 'react';
import { useAuth } from './AuthContext';

export default function ResetPasswordPage({ recoveryToken }: { recoveryToken: string }) {
  const { resetPassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

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
      await resetPassword(recoveryToken, password);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card" role="main" aria-label="Reset your password">
        <div className="login-header">
          <img src="/logo.svg" alt="VOD GROUP" className="login-logo-img" />
          <p className="login-subtitle">Reset your password</p>
        </div>

        {done ? (
          <div className="login-form">
            <div className="login-alert login-alert-success" role="status">
              Password updated. You can now sign in with your new password.
            </div>
            <a href="/" className="btn btn-primary btn-login" style={{ display: 'block', textAlign: 'center', marginTop: 8 }}>
              Go to Sign In
            </a>
          </div>
        ) : (
          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <p style={{ margin: '0 0 16px', fontSize: '0.875rem', color: '#6b7280' }}>
              Enter a new password for your account.
            </p>
            {error && <div className="login-alert" role="alert">{error}</div>}
            <div className="form-group">
              <label htmlFor="reset-password">New Password</label>
              <input
                id="reset-password" type="password" autoComplete="new-password"
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="At least 8 characters" required autoFocus
              />
            </div>
            <div className="form-group">
              <label htmlFor="reset-confirm">Confirm Password</label>
              <input
                id="reset-confirm" type="password" autoComplete="new-password"
                value={confirm} onChange={e => setConfirm(e.target.value)}
                placeholder="Repeat your password" required
              />
            </div>
            <button type="submit" className="btn btn-primary btn-login" disabled={loading}>
              {loading ? 'Saving...' : 'Set New Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
