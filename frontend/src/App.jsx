import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import EmployeeList from './components/EmployeeList';
import EmployeeProfile from './components/EmployeeProfile';
import Navbar from './components/Navbar';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import ChangePasswordModal from './components/ChangePasswordModal';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      // The flag is not trusted from localStorage: a reload must re-confirm it
      // with the server, which is the only authority on whether the temporary
      // password is still in place.
      setMustChangePassword(localStorage.getItem('mustChangePassword') === 'true');
    }
    setLoading(false);
  }, []);

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setMustChangePassword(false);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('mustChangePassword');
  };

  const handleLoginSuccess = (t, u, forceChange) => {
    setToken(t);
    setUser(u);
    setMustChangePassword(Boolean(forceChange));
    localStorage.setItem('token', t);
    localStorage.setItem('user', JSON.stringify(u));
    if (forceChange) {
      localStorage.setItem('mustChangePassword', 'true');
    } else {
      localStorage.removeItem('mustChangePassword');
    }
  };

  const handleForcedChangeComplete = () => {
    setMustChangePassword(false);
    localStorage.removeItem('mustChangePassword');
  };

  if (loading) return <div className="container">Loading...</div>;

  /*
   * While the temporary password stands, the modal is the entire interface:
   * no navbar and no routes, mirroring the backend, which is returning 403 for
   * every endpoint except the one this form calls.
   */
  if (token && mustChangePassword) {
    return (
      <BrowserRouter>
        <ChangePasswordModal forced onSuccess={handleForcedChangeComplete} />
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      {token && <Navbar user={user} onLogout={handleLogout} />}
      <Routes>
        <Route path="/" element={token ? <Dashboard /> : <Navigate to="/login" />} />
        <Route
          path="/login"
          element={!token ? <Login onLoginSuccess={handleLoginSuccess} /> : <Navigate to="/" />}
        />
        {/* Reachable only when signed out: a signed-in user changes their
            password from Settings instead. */}
        <Route path="/forgot-password" element={!token ? <ForgotPassword /> : <Navigate to="/" />} />
        <Route
          path="/reset-password/:token"
          element={!token ? <ResetPassword /> : <Navigate to="/" />}
        />
        <Route path="/employees" element={token ? <EmployeeList /> : <Navigate to="/login" />} />
        <Route
          path="/employees/:id"
          element={token ? <EmployeeProfile /> : <Navigate to="/login" />}
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
