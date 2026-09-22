import { Link } from 'react-router-dom';
import { useState } from 'react';
import ChangePasswordModal from './ChangePasswordModal';
import './Navbar.css';

function Navbar({ user, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordChanged, setPasswordChanged] = useState(false);

  const handleLogout = () => {
    setMenuOpen(false);
    onLogout();
  };

  const openChangePassword = () => {
    setMenuOpen(false);
    setPasswordChanged(false);
    setShowChangePassword(true);
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Logo Section */}
        <div className="navbar-brand">
          <Link to="/" className="navbar-logo" onClick={() => setMenuOpen(false)}>
            <img
              src="https://evereco.co.uk/wp-content/uploads/2024/08/Ever_eco_logo_energy_uk-e1789738915204.png"
              alt="Evereco Energy Logo"
              className="navbar-logo-img"
            />
            <span className="navbar-company">Evereco Energy</span>
          </Link>
        </div>

        {/* Hamburger Menu Button (Mobile) */}
        <button
          className={`hamburger-menu ${menuOpen ? 'open' : ''}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle navigation menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        {/* Navigation Items */}
        <div className={`navbar-nav ${menuOpen ? 'open' : ''}`}>
          <Link to="/" className="nav-link" onClick={() => setMenuOpen(false)}>
            Dashboard
          </Link>
          <Link to="/employees" className="nav-link" onClick={() => setMenuOpen(false)}>
            Employees
          </Link>

          <div className="nav-user">
            <span className="nav-user-info">
              {user?.name} <span className="nav-user-role">({user?.role})</span>
            </span>
            <button onClick={openChangePassword} className="nav-settings-btn">
              Change Password
            </button>
            <button
              onClick={handleLogout}
              className="nav-logout-btn"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {showChangePassword && (
        <ChangePasswordModal
          onClose={() => setShowChangePassword(false)}
          onSuccess={() => {
            setShowChangePassword(false);
            setPasswordChanged(true);
          }}
        />
      )}

      {/* The session keeps working after a change: the existing token stays
          valid until it expires, so there is nothing to re-authenticate. */}
      {passwordChanged && (
        <div className="password-changed-toast" role="status">
          Password changed successfully
          <button onClick={() => setPasswordChanged(false)} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}
    </nav>
  );
}

export default Navbar;
