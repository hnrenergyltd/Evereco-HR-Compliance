import { useState } from 'react';

function MobileClockInOut({ employee }) {
  const [clockedIn, setClockedIn] = useState(false);
  const [clockInTime, setClockInTime] = useState(null);
  const [workLocation, setWorkLocation] = useState('head_office');

  const handleClockIn = () => {
    const now = new Date().toLocaleTimeString();
    setClockInTime(now);
    setClockedIn(true);
  };

  const handleClockOut = () => {
    setClockedIn(false);
  };

  return (
    <div className="card" style={{ maxWidth: '400px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h2>{employee?.first_name} {employee?.surname}</h2>
        <p style={{ color: 'var(--text-light)' }}>Attendance Clock In/Out</p>
      </div>

      {/* Status Display */}
      <div style={{
        background: 'var(--light)',
        padding: '20px',
        borderRadius: '8px',
        textAlign: 'center',
        marginBottom: '20px'
      }}>
        <p style={{ color: 'var(--text-light)', marginBottom: '5px' }}>Status</p>
        <p style={{ fontSize: '1.5em', fontWeight: 'bold', color: 'var(--primary)' }}>
          {clockedIn ? `Clocked In: ${clockInTime}` : 'Not Clocked In'}
        </p>
      </div>

      {/* Work Location Selection */}
      {!clockedIn && (
        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontWeight: '600', color: 'var(--primary)', display: 'block', marginBottom: '8px' }}>
            Select Work Location:
          </label>
          <select
            value={workLocation}
            onChange={(e) => setWorkLocation(e.target.value)}
            className="form-group"
            style={{ width: '100%' }}
          >
            <option value="head_office">Head Office</option>
            <option value="home">Home</option>
            <option value="customer_property">Customer Property</option>
            <option value="project_site">Project/Site</option>
            <option value="other">Other</option>
          </select>
        </div>
      )}

      {/* Clock In/Out Button */}
      <button
        onClick={clockedIn ? handleClockOut : handleClockIn}
        style={{
          width: '100%',
          padding: '20px',
          fontSize: '1.1em',
          fontWeight: '700',
          background: clockedIn ? 'var(--danger)' : 'var(--secondary)',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
        }}
        onMouseOver={(e) => e.target.style.opacity = '0.9'}
        onMouseOut={(e) => e.target.style.opacity = '1'}
      >
        {clockedIn ? 'CLOCK OUT' : 'CLOCK IN'}
      </button>

      {/* View History Link */}
      <div style={{ textAlign: 'center', marginTop: '15px' }}>
        <a href="#" style={{ color: 'var(--secondary)', textDecoration: 'none', fontSize: '0.9em' }}>
          View My Attendance →
        </a>
      </div>
    </div>
  );
}

export default MobileClockInOut;
