import { useState } from 'react';
import api from '../services/api';
import './AddEmployeeModal.css';

function AddEmployeeModal({ onClose, onEmployeeAdded }) {
  const [formData, setFormData] = useState({
    first_name: '',
    surname: '',
    email: '',
    job_title: '',
    department: '',
    employment_status: 'active',
    send_login_email: true,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validation
    if (!formData.first_name.trim() || !formData.surname.trim() || !formData.email.trim()) {
      setError('Full name and email are required');
      setLoading(false);
      return;
    }

    if (!formData.email.includes('@')) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    try {
      const response = await api.post('/employees', formData);

      setSuccess({
        name: `${response.data.first_name} ${response.data.surname}`,
        email: response.data.email,
        tempPassword: response.data.temp_password,
        emailSent: response.data.email_sent,
        requestedEmail: formData.send_login_email,
        id: response.data.id,
      });

      // Reset form
      setFormData({
        first_name: '',
        surname: '',
        email: '',
        job_title: '',
        department: '',
        employment_status: 'active',
        send_login_email: true,
      });

      /*
       * The list refreshes in the background, but the success panel stays up
       * until dismissed: it shows the temporary password, which is displayed
       * once and cannot be retrieved afterwards.
       */
      onEmployeeAdded(response.data, { keepOpen: true });

    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create employee. Email might already exist.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content success-modal" onClick={(e) => e.stopPropagation()}>
          <div className="success-icon">✅</div>
          <h2>Employee Created Successfully!</h2>

          <div className="success-details">
            <div className="detail-row">
              <span className="label">Name:</span>
              <span className="value">{success.name}</span>
            </div>
            <div className="detail-row">
              <span className="label">Email:</span>
              <span className="value">{success.email}</span>
            </div>
            <div className="detail-row">
              <span className="label">Temporary Password:</span>
              <span className="value temp-password">{success.tempPassword}</span>
            </div>
          </div>

          <button
            type="button"
            className="btn-copy-credentials"
            onClick={() => {
              navigator.clipboard
                ?.writeText(`Email: ${success.email}\nTemporary Password: ${success.tempPassword}`)
                .then(() => setCopied(true))
                .catch(() => setCopied(false));
            }}
          >
            {copied ? 'Copied ✓' : 'Copy credentials'}
          </button>

          {success.requestedEmail && success.emailSent && (
            <div className="info-box">
              <strong>Email sent.</strong>
              <p>The login details have been emailed to {success.email}.</p>
            </div>
          )}

          {success.requestedEmail && !success.emailSent && (
            <div className="warning-box">
              <strong>⚠️ Email could not be sent</strong>
              <p>
                Mail delivery is not configured, so nothing was sent. Copy the password above and
                give it to the employee yourself.
              </p>
            </div>
          )}

          <div className="warning-box">
            <strong>⚠️ Important:</strong>
            <p>
              This password is shown once and cannot be retrieved later. The employee must change
              it the first time they sign in.
            </p>
          </div>

          <button className="btn btn-primary" onClick={onClose} style={{ width: '100%' }}>
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add New Employee</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="add-employee-form">
          <div className="form-row">
            <div className="form-group">
              <label>First Name *</label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                placeholder="Enter first name"
                required
              />
            </div>
            <div className="form-group">
              <label>Last Name *</label>
              <input
                type="text"
                name="surname"
                value={formData.surname}
                onChange={handleChange}
                placeholder="Enter last name"
                required
              />
            </div>
          </div>

          <div className="form-group full-width">
            <label>Email Address *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="e.g., john@everecoenergy.com"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Job Title</label>
              <input
                type="text"
                name="job_title"
                value={formData.job_title}
                onChange={handleChange}
                placeholder="e.g., Operations Manager"
              />
            </div>
            <div className="form-group">
              <label>Department</label>
              <input
                type="text"
                name="department"
                value={formData.department}
                onChange={handleChange}
                placeholder="e.g., Operations"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Employment Status</label>
            <select
              name="employment_status"
              value={formData.employment_status}
              onChange={handleChange}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="probation">Probation</option>
            </select>
          </div>

          <label className="send-email-option">
            <input
              type="checkbox"
              name="send_login_email"
              checked={formData.send_login_email}
              onChange={handleChange}
            />
            <span>
              Send login email to employee
              <small>
                A temporary password is generated either way and shown to you once on the next
                screen.
              </small>
            </span>
          </label>

          <div className="form-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ minHeight: '50px', flex: 1 }}
            >
              {loading ? 'Creating...' : 'Create Employee'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
              style={{ minHeight: '50px', flex: 1 }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddEmployeeModal;
