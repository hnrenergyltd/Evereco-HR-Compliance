import { useState } from 'react';
import api from '../services/api';
import PasswordStrength from './PasswordStrength';
import { evaluatePassword } from '../utils/passwordPolicy';
import './ChangePasswordModal.css';

/*
 * Serves both entry points:
 *  - Settings → Change Password, which can be dismissed.
 *  - The forced change after an admin-issued temporary password (`forced`),
 *    which has no close control and no backdrop dismissal, because the rest of
 *    the API is refusing this user until the password is replaced.
 */
function ChangePasswordModal({ onClose, onSuccess, forced = false }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const policy = evaluatePassword(newPassword);
  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
  const canSubmit =
    currentPassword.length > 0 && policy.valid && newPassword === confirmPassword && !saving;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!policy.valid) {
      setError('New password does not meet the requirements');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    if (newPassword === currentPassword) {
      setError('New password must be different from the current one');
      return;
    }

    setSaving(true);
    try {
      await api.put('/auth/change-password', { currentPassword, newPassword });
      onSuccess?.();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not change password. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={forced ? undefined : onClose}>
      <div className="modal-content change-password-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{forced ? 'Change your temporary password' : 'Change Password'}</h2>
          {!forced && (
            <button className="modal-close" onClick={onClose} aria-label="Close">
              ×
            </button>
          )}
        </div>

        {forced && (
          <p className="forced-notice">
            Your account was created with a temporary password. Choose your own password to
            continue.
          </p>
        )}

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{forced ? 'Temporary password' : 'Current password'}</label>
            <input
              type={showPasswords ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          <div className="form-group">
            <label>New password</label>
            <input
              type={showPasswords ? 'text' : 'password'}
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
              type={showPasswords ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
            {mismatch && <span className="field-error">Passwords do not match</span>}
          </div>

          <label className="show-passwords">
            <input
              type="checkbox"
              checked={showPasswords}
              onChange={(e) => setShowPasswords(e.target.checked)}
            />
            Show passwords
          </label>

          <div className="modal-actions">
            {!forced && (
              <button type="button" className="btn-cancel" onClick={onClose} disabled={saving}>
                Cancel
              </button>
            )}
            <button type="submit" className="btn-save" disabled={!canSubmit}>
              {saving ? 'Saving...' : 'Confirm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ChangePasswordModal;
