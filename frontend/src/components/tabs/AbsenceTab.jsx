import { useState, useEffect } from 'react';
import '../tabs/AbsenceTab.css';

function AbsenceTab({ employee, currentUser, isReadOnly = false }) {
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Filter state
  const [filterStartDate, setFilterStartDate] = useState(() => {
    const year = new Date().getFullYear();
    return `${year}-01-01`;
  });
  const [filterEndDate, setFilterEndDate] = useState(() => {
    const year = new Date().getFullYear();
    return `${year}-12-31`;
  });
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Request leave form state
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestData, setRequestData] = useState({
    startDate: '',
    endDate: '',
    reason: ''
  });

  // Add absence form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [addData, setAddData] = useState({
    absenceType: 'Sickness',
    startDate: '',
    endDate: '',
    workingDays: 0,
    reason: '',
    status: 'Approved',
    notes: ''
  });

  useEffect(() => {
    fetchSummary();
    fetchHistory();
  }, [employee.id]);

  async function fetchSummary() {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/employees/${employee.id}/absence/summary`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setSummary(data);
      }
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  }

  async function fetchHistory() {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (filterStartDate) params.append('startDate', filterStartDate);
      if (filterEndDate) params.append('endDate', filterEndDate);
      if (filterType) params.append('absenceType', filterType);
      if (filterStatus) params.append('status', filterStatus);

      const response = await fetch(`/api/employees/${employee.id}/absence/history?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setHistory(data);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRequestLeave() {
    if (!requestData.startDate || !requestData.endDate) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' });
      return;
    }

    setIsProcessing(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/employees/${employee.id}/absence/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestData)
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Annual leave requested successfully' });
        setShowRequestForm(false);
        setRequestData({ startDate: '', endDate: '', reason: '' });
        setTimeout(() => setMessage(null), 3000);
        fetchSummary();
        fetchHistory();
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.error || 'Failed to request leave' });
      }
    } catch (error) {
      console.error('Error:', error);
      setMessage({ type: 'error', text: 'Failed to request leave' });
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleAddAbsence() {
    if (!addData.absenceType || !addData.startDate || !addData.endDate) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' });
      return;
    }

    setIsProcessing(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/employees/${employee.id}/absence/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(addData)
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Absence record added successfully' });
        setShowAddForm(false);
        setAddData({ absenceType: 'Sickness', startDate: '', endDate: '', workingDays: 0, reason: '', status: 'Approved', notes: '' });
        setTimeout(() => setMessage(null), 3000);
        fetchSummary();
        fetchHistory();
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.error || 'Failed to add absence' });
      }
    } catch (error) {
      console.error('Error:', error);
      setMessage({ type: 'error', text: 'Failed to add absence' });
    } finally {
      setIsProcessing(false);
    }
  }

  function formatDate(dateString) {
    if (!dateString) return '--';
    return new Date(dateString).toLocaleDateString('en-GB');
  }

  if (isLoading || !summary) {
    return <div className="absence-container"><p>Loading...</p></div>;
  }

  return (
    <div className="absence-container">
      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      {/* Summary Cards */}
      <div className="summary-cards">
        {/* Annual Leave Card */}
        <div className="summary-card annual-leave">
          <h3>Annual Leave</h3>
          <div className="metrics">
            <div className="metric">
              <span className="label">Entitlement</span>
              <span className="value">{summary.annualLeave.entitlement} days</span>
            </div>
            <div className="metric">
              <span className="label">Taken</span>
              <span className="value">{summary.annualLeave.taken} days</span>
            </div>
            <div className="metric">
              <span className="label">Booked</span>
              <span className="value">{summary.annualLeave.booked} days</span>
            </div>
            <div className="metric">
              <span className="label">Remaining</span>
              <span className="value highlight">{summary.annualLeave.remaining} days</span>
            </div>
          </div>
          {currentUser?.role === 'employee' && (
            <button className="btn-card" onClick={() => setShowRequestForm(true)}>Request Annual Leave</button>
          )}
          {currentUser?.role === 'admin' && (
            <button className="btn-card admin" onClick={() => { setAddData({ ...addData, absenceType: 'Annual Leave' }); setShowAddForm(true); }}>
              Add Annual Leave
            </button>
          )}
        </div>

        {/* Sickness Card */}
        <div className="summary-card sickness">
          <h3>Sickness</h3>
          <div className="metrics">
            <div className="metric">
              <span className="label">Logged</span>
              <span className="value">{summary.sickness.logged} times</span>
            </div>
            <div className="metric">
              <span className="label">Total</span>
              <span className="value">{summary.sickness.days} days</span>
            </div>
          </div>
          {currentUser?.role === 'admin' && (
            <button className="btn-card" onClick={() => { setAddData({ ...addData, absenceType: 'Sickness' }); setShowAddForm(true); }}>
              Add Sickness
            </button>
          )}
        </div>

        {/* Authorised Absence Card */}
        <div className="summary-card authorised">
          <h3>Authorised Absence</h3>
          <div className="metrics">
            <div className="metric">
              <span className="label">Logged</span>
              <span className="value">{summary.authorisedAbsence.logged} times</span>
            </div>
            <div className="metric">
              <span className="label">Total</span>
              <span className="value">{summary.authorisedAbsence.days} days</span>
            </div>
          </div>
          {currentUser?.role === 'admin' && (
            <button className="btn-card" onClick={() => { setAddData({ ...addData, absenceType: 'Authorised Absence' }); setShowAddForm(true); }}>
              Add Authorised Absence
            </button>
          )}
        </div>

        {/* Unauthorised Absence Card */}
        <div className="summary-card unauthorised">
          <h3>Unauthorised Absence</h3>
          <div className="metrics">
            <div className="metric">
              <span className="label">Logged</span>
              <span className="value">{summary.unauthorisedAbsence.logged} times</span>
            </div>
            <div className="metric">
              <span className="label">Total</span>
              <span className="value">{summary.unauthorisedAbsence.days} days</span>
            </div>
          </div>
          {currentUser?.role === 'admin' && (
            <button className="btn-card" onClick={() => { setAddData({ ...addData, absenceType: 'Unauthorised Absence' }); setShowAddForm(true); }}>
              Add Unauthorised Absence
            </button>
          )}
        </div>

        {/* Parental Leave Card */}
        <div className="summary-card parental">
          <h3>Parental Leave</h3>
          <div className="metrics">
            <div className="metric">
              <span className="label">Logged</span>
              <span className="value">{summary.parentalLeave.logged} times</span>
            </div>
            <div className="metric">
              <span className="label">Total</span>
              <span className="value">{summary.parentalLeave.days} days</span>
            </div>
          </div>
          {currentUser?.role === 'admin' && (
            <button className="btn-card" onClick={() => { setAddData({ ...addData, absenceType: 'Parental Leave' }); setShowAddForm(true); }}>
              Add Parental Leave
            </button>
          )}
        </div>

        {/* Other Card */}
        <div className="summary-card other">
          <h3>Other Absence</h3>
          <div className="metrics">
            <div className="metric">
              <span className="label">Logged</span>
              <span className="value">{summary.other.logged} times</span>
            </div>
            <div className="metric">
              <span className="label">Total</span>
              <span className="value">{summary.other.days} days</span>
            </div>
          </div>
          {currentUser?.role === 'admin' && (
            <button className="btn-card" onClick={() => { setAddData({ ...addData, absenceType: 'Other' }); setShowAddForm(true); }}>
              Add Other Absence
            </button>
          )}
        </div>
      </div>

      {/* Filter Section */}
      <div className="filter-section">
        <div className="filter-group">
          <label>From Date</label>
          <input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} />
        </div>
        <div className="filter-group">
          <label>To Date</label>
          <input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} />
        </div>
        <div className="filter-group">
          <label>Absence Type</label>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="">All Types</option>
            <option value="Annual Leave">Annual Leave</option>
            <option value="Sickness">Sickness</option>
            <option value="Authorised Absence">Authorised Absence</option>
            <option value="Unauthorised Absence">Unauthorised Absence</option>
            <option value="Parental Leave">Parental Leave</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Status</label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
        <button className="btn-filter" onClick={fetchHistory}>Apply Filter</button>
      </div>

      {/* History Table */}
      <div className="history-section">
        <h3>Absence History</h3>
        {history.length === 0 ? (
          <p className="empty-message">No absence records</p>
        ) : (
          <div className="table-wrapper">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Date Range</th>
                  <th>Type</th>
                  <th>Working Days</th>
                  <th>Status</th>
                  <th>Approved By</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {history.map(record => (
                  <tr key={record.id}>
                    <td>{formatDate(record.start_date)} – {formatDate(record.end_date)}</td>
                    <td>{record.absence_type}</td>
                    <td>{record.working_days}</td>
                    <td><span className={`status-badge ${record.status.toLowerCase()}`}>{record.status}</span></td>
                    <td>{record.approved_by ? 'Admin' : '—'}</td>
                    <td>
                      <button className="btn-action">View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Request Leave Modal */}
      {showRequestForm && (
        <div className="modal-overlay" onClick={() => setShowRequestForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Request Annual Leave</h3>
            <div className="form-group">
              <label>Start Date *</label>
              <input type="date" value={requestData.startDate} onChange={(e) => setRequestData({ ...requestData, startDate: e.target.value })} />
            </div>
            <div className="form-group">
              <label>End Date *</label>
              <input type="date" value={requestData.endDate} onChange={(e) => setRequestData({ ...requestData, endDate: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Reason (Optional)</label>
              <textarea value={requestData.reason} onChange={(e) => setRequestData({ ...requestData, reason: e.target.value })} placeholder="Enter reason for leave" rows="3" />
            </div>
            <div className="form-actions">
              <button className="btn-submit" onClick={handleRequestLeave} disabled={isProcessing}>
                {isProcessing ? 'Submitting...' : 'Request Leave'}
              </button>
              <button className="btn-cancel" onClick={() => setShowRequestForm(false)} disabled={isProcessing}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Absence Modal */}
      {showAddForm && currentUser?.role === 'admin' && (
        <div className="modal-overlay" onClick={() => setShowAddForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Add Absence Record</h3>
            <div className="form-group">
              <label>Absence Type *</label>
              <select value={addData.absenceType} onChange={(e) => setAddData({ ...addData, absenceType: e.target.value })}>
                <option value="Annual Leave">Annual Leave</option>
                <option value="Sickness">Sickness</option>
                <option value="Authorised Absence">Authorised Absence</option>
                <option value="Unauthorised Absence">Unauthorised Absence</option>
                <option value="Parental Leave">Parental Leave</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label>Start Date *</label>
              <input type="date" value={addData.startDate} onChange={(e) => setAddData({ ...addData, startDate: e.target.value })} />
            </div>
            <div className="form-group">
              <label>End Date *</label>
              <input type="date" value={addData.endDate} onChange={(e) => setAddData({ ...addData, endDate: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Working Days</label>
              <input type="number" value={addData.workingDays} onChange={(e) => setAddData({ ...addData, workingDays: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="form-group">
              <label>Reason (Optional)</label>
              <textarea value={addData.reason} onChange={(e) => setAddData({ ...addData, reason: e.target.value })} placeholder="Enter reason" rows="2" />
            </div>
            <div className="form-group">
              <label>Status</label>
              <select value={addData.status} onChange={(e) => setAddData({ ...addData, status: e.target.value })}>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
              </select>
            </div>
            <div className="form-group">
              <label>Notes (Optional)</label>
              <textarea value={addData.notes} onChange={(e) => setAddData({ ...addData, notes: e.target.value })} placeholder="Add notes" rows="2" />
            </div>
            <div className="form-actions">
              <button className="btn-submit" onClick={handleAddAbsence} disabled={isProcessing}>
                {isProcessing ? 'Adding...' : 'Add Absence'}
              </button>
              <button className="btn-cancel" onClick={() => setShowAddForm(false)} disabled={isProcessing}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AbsenceTab;


