function OverviewTab({ employee, currentUser, isReadOnly = false }) {
  const getStatusColor = (status) => {
    switch(status) {
      case 'valid':
      case 'active':
        return { bg: '#d4edda', color: '#155724', text: 'Valid' };
      case 'expiring_soon':
      case 'pending':
        return { bg: '#fff3cd', color: '#856404', text: 'Attention' };
      case 'expired':
      case 'inactive':
        return { bg: '#f8d7da', color: '#721c24', text: 'Expired' };
      default:
        return { bg: '#e9ecef', color: '#6c757d', text: 'Not Set' };
    }
  };

  const renderStatusCard = (label, status) => {
    const colors = getStatusColor(status);
    return (
      <div style={{
        backgroundColor: colors.bg,
        border: `2px solid ${colors.color}`,
        padding: '15px',
        borderRadius: '8px',
        textAlign: 'center',
        marginBottom: '10px',
        transition: 'all 0.3s ease'
      }}>
        <div style={{ color: colors.color, fontWeight: '700', fontSize: '1em' }}>
          {colors.text}
        </div>
        <div style={{ color: colors.color, fontSize: '0.85em', marginTop: '8px', fontWeight: '500' }}>
          {label}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="card" style={{ marginBottom: '20px' }}>
        <h3>Employment Information</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginTop: '15px' }}>
          <div>
            <p style={{ color: 'var(--text-light)', fontSize: '0.9em', marginBottom: '5px' }}>Job Title</p>
            <p style={{ fontWeight: '600', color: 'var(--primary)' }}>{employee?.job_title || '-'}</p>
          </div>
          <div>
            <p style={{ color: 'var(--text-light)', fontSize: '0.9em', marginBottom: '5px' }}>Department</p>
            <p style={{ fontWeight: '600', color: 'var(--primary)' }}>{employee?.department || '-'}</p>
          </div>
          <div>
            <p style={{ color: 'var(--text-light)', fontSize: '0.9em', marginBottom: '5px' }}>Manager</p>
            <p style={{ fontWeight: '600', color: 'var(--primary)' }}>TBD</p>
          </div>
          <div>
            <p style={{ color: 'var(--text-light)', fontSize: '0.9em', marginBottom: '5px' }}>Employment Type</p>
            <p style={{ fontWeight: '600', color: 'var(--primary)' }}>Full-time</p>
          </div>
          <div>
            <p style={{ color: 'var(--text-light)', fontSize: '0.9em', marginBottom: '5px' }}>Work Location</p>
            <p style={{ fontWeight: '600', color: 'var(--primary)' }}>Head Office</p>
          </div>
          <div>
            <p style={{ color: 'var(--text-light)', fontSize: '0.9em', marginBottom: '5px' }}>Employment Status</p>
            <p><span className={`status-badge status-${employee?.employment_status}`}>{employee?.employment_status}</span></p>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Compliance Status</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', marginTop: '15px' }}>
          {renderStatusCard('Right to Work', employee?.sponsored_worker ? 'pending' : 'valid')}
          {renderStatusCard('Visa Status', employee?.sponsored_worker ? 'valid' : 'default')}
          {renderStatusCard('Attendance', 'valid')}
          {renderStatusCard('Documents', 'valid')}
        </div>
      </div>
    </div>
  );
}

export default OverviewTab;
