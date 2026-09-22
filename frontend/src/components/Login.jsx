import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import './AuthPages.css';

function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/auth/login', { email, password });
      // mustChangePassword is passed up so App can show the forced-change
      // screen instead of the dashboard; the rest of the API refuses this
      // user until it is cleared.
      onLoginSuccess(response.data.token, response.data.user, response.data.mustChangePassword);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '400px', marginTop: '50px' }}>
      <div className="card">
        <h1 style={{ textAlign: 'center', marginBottom: '30px' }}>
          Evereco Energy HR System
        </h1>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} autoComplete="off">
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="off"
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="off"
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        {/* The hardcoded demo credentials that used to sit here were removed:
            they published a working administrator password to anyone who
            opened the login page. */}
        <div className="login-forgot">
          <Link to="/forgot-password">Forgot password?</Link>
        </div>
      </div>
    </div>
  );
}

export default Login;
