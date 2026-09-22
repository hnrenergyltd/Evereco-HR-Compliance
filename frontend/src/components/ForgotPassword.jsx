import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import './AuthPages.css';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/auth/forgot-password', { email });
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /*
   * The confirmation deliberately does not say whether the address matched an
   * account — that would turn this page into a way of discovering who has one.
   */
  if (submitted) {
    return (
      <div className="auth-page">
        <div className="card auth-card">
          <h1>Check your email</h1>
          <p className="auth-message">
            If an account exists for <strong>{email}</strong>, a password reset link has been sent.
            The link expires in one hour.
          </p>
          <Link to="/login" className="btn btn-primary auth-btn">
            Back to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="card auth-card">
        <h1>Forgot password</h1>
        <p className="auth-message">
          Enter the email address for your account and we'll send you a link to reset your
          password.
        </p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <button type="submit" className="btn btn-primary auth-btn" disabled={loading || !email}>
            {loading ? 'Sending...' : 'Send reset link'}
          </button>
        </form>

        <div className="auth-footer">
          <Link to="/login">Back to login</Link>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
