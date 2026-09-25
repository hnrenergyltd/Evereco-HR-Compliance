import { useState, useEffect } from 'react';
import api from '../services/api';
import '../components/Dashboard.css';

function Dashboard() {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    workingToday: 0,
    absentToday: 0,
    sponsoredWorkers: 0,
  });
  const [currentUser, setCurrentUser] = useState(null);
  const [clockStatus, setClockStatus] = useState(null);
  const [location, setLocation] = useState('Head Office');
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await api.get('/dashboard');
        setStats(response.data);

        const userStr = localStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          setCurrentUser(user);

          // Admins have no employee record of their own, and user.id is not an
          // employee id — falling back to it clocked the admin in against
          // whichever employee happened to share that number.
          const empId = user?.employee_id;
          if (user?.role === 'employee' && empId) {
            const clockRes = await api.get(`/employees/${empId}/attendance/status`);
            setIsClockedIn(clockRes.data.isClockedIn);
            if (clockRes.data.isClockedIn) {
              setClockStatus(clockRes.data.record);
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const handleClockIn = async () => {
    setIsProcessing(true);
    setMessage(null);

    try {
      const empId = currentUser?.employee_id;
      const response = await api.post(`/employees/${empId}/attendance/clock-in`, {
        location,
        site_name: null
      });

      if (response.status === 201) {
        setIsClockedIn(true);
        setClockStatus(response.data);
        setMessage({ type: 'success', text: `Clocked in at ${new Date(response.data.clock_in_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to clock in' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClockOut = async () => {
    setIsProcessing(true);
    setMessage(null);

    try {
      const empId = currentUser?.employee_id;
      const response = await api.put(`/employees/${empId}/attendance/${clockStatus.id}/clock-out`);

      if (response.status === 200) {
        setIsClockedIn(false);
        setClockStatus(null);
        setMessage({ type: 'success', text: response.data.message });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to clock out' });
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return <div className="container">Loading...</div>;

  return (
    <div className="container">
      <h1>Dashboard</h1>

      {message && (
        <div className={`message ${message.type}`} style={{ marginTop: '20px' }}>
          {message.text}
        </div>
      )}

      {currentUser?.role === 'employee' && (
        <div className="attendance-card" style={{ marginTop: '30px' }}>
          <h2>TODAY'S ATTENDANCE</h2>
          <p className="employee-name">{currentUser.name || currentUser.email || 'Employee'}</p>

          {!isClockedIn ? (
            <div>
              <p className="status">Status: Not Clocked In</p>
              <div className="form-group">
                <label>Work Location *</label>
                <select value={location} onChange={(e) => setLocation(e.target.value)}>
                  <option value="Head Office">Head Office</option>
                  <option value="Home">Home</option>
                  <option value="Customer Property">Customer Property</option>
                  <option value="Project / Site">Project / Site</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <button
                onClick={handleClockIn}
                disabled={isProcessing}
                className="btn-clock-in"
              >
                {isProcessing ? 'Clocking In...' : 'CLOCK IN'}
              </button>
            </div>
          ) : (
            <div>
              <div className="status-badge">Clocked In</div>
              <p className="time-display">{new Date(clockStatus?.clock_in_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</p>
              <p className="location">{clockStatus?.location}</p>
              <button
                onClick={handleClockOut}
                disabled={isProcessing}
                className="btn-clock-out"
              >
                {isProcessing ? 'Clocking Out...' : 'CLOCK OUT'}
              </button>
            </div>
          )}
        </div>
      )}

      {currentUser?.role === 'admin' && (
        <>
          <div className="grid" style={{ marginTop: '30px' }}>
            <div className="stat-card">
              <h3>Total Employees</h3>
              <div className="number">{stats.totalEmployees}</div>
            </div>

            <div className="stat-card">
              <h3>Working Today</h3>
              <div className="number">{stats.workingToday}</div>
            </div>

            <div className="stat-card">
              <h3>Absent Today</h3>
              <div className="number">{stats.absentToday}</div>
            </div>

            <div className="stat-card">
              <h3>Sponsored Workers</h3>
              <div className="number">{stats.sponsoredWorkers}</div>
            </div>
          </div>

          <div className="card" style={{ marginTop: '30px' }}>
            <h2>Admin Quick Start</h2>
            <p>Welcome to Evereco Energy HR & Sponsor Licence Compliance System</p>
            <ul style={{ marginLeft: '20px', marginTop: '10px' }}>
              <li><strong>Manage Employees:</strong> Go to Employees section to view, create, and manage employee records</li>
              <li><strong>Employee Profiles:</strong> Click any employee to access their complete profile with 9 tabs including employment details, documents, and sponsorship info</li>
              <li><strong>Attendance Tracking:</strong> Monitor employee clock in/out records and attendance patterns</li>
              <li><strong>Sponsorship Licenses:</strong> Track and manage Skilled Worker visa sponsorship records</li>
              <li><strong>Compliance & Audit:</strong> Access audit trails and compliance alerts for regulatory requirements</li>
            </ul>
          </div>
        </>
      )}

      {currentUser?.role === 'employee' && (
        <div className="card" style={{ marginTop: '30px' }}>
          <h2>Quick Tips for Employees</h2>
          <ul style={{ marginLeft: '20px', marginTop: '10px' }}>
            <li><strong>Clock In/Out:</strong> Use the TODAY'S ATTENDANCE section above to log your working hours</li>
            <li><strong>View Your Profile:</strong> Go to Employees section to see your personal and employment details</li>
            <li><strong>Request Leave:</strong> Visit the Absence section in your profile to request time off</li>
            <li><strong>Need Help?</strong> Contact HR department or your manager for any questions</li>
          </ul>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
