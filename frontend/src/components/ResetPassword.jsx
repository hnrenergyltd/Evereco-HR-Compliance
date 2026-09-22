import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import PasswordStrength from './PasswordStrength';
import { evaluatePassword } from '../utils/passwordPolicy';
import './AuthPages.css';

function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  const policy = evaluatePassword(newPassword);
  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
  const canSubmit = policy.valid && newPassword === confirmPassword && !saving;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!policy.valid) {
      setError('Password does not meet the requirements');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSaving(true);
    try {
      await api.post(`/auth/reset-password/${token}`, { newPassword });
      setDone(true);
      // Brief pause so the confirmation is readable before the redirect.
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not reset password. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <div className="auth-page">
        <div className="card auth-card">
          <h1>Password reset</h1>
          <p className="auth-message">
            Your password has been changed. Redirecting you to the login page...
          </p>
          <Link to="/login" className="btn btn-primary auth-btn">
            Go to login now
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="card auth-card">
        <h1>Set a new password</h1>

        {error && (
          <div className="alert alert-error">
            {error}
            {/* An invalid or expired link is a dead end, so offer the way out. */}
            {error.toLowerCase().includes('expired') && (
              <>
                {' '}
                <Link to="/forgot-password">Request a new link</Link>
              </>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>New password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
            <PasswordStrength password={newPassword} />
          </div>

          <div className="form-group">
            <label>Confirm new password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
            {mismatch && <span className="field-error">Passwords do not match</span>}
          </div>

          <button type="submit" className="btn btn-primary auth-btn" disabled={!canSubmit}>
            {saving ? 'Saving...' : 'Reset password'}
          </button>
        </form>

        <div className="auth-footer">
          <Link to="/login">Back to login</Link>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;
