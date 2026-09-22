import { useState, useEffect } from 'react';
import '../tabs/AttendanceTab.css';

function AttendanceTab({ employee, currentUser, isReadOnly = false }) {
  const [clockStatus, setClockStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState(null);
  const [location, setLocation] = useState('Head Office');
  const [siteName, setSiteName] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showCorrectionForm, setShowCorrectionForm] = useState(false);
  const [correctionData, setCorrectionData] = useState({
    requested_clock_in: '',
    requested_clock_out: '',
    reason: ''
  });
  const [showRetrospectiveForm, setShowRetrospectiveForm] = useState(false);
  const [retrospectiveData, setRetrospectiveData] = useState({
    work_date: '',
    clock_in_time: '',
    clock_out_time: '',
    location: 'Head Office',
    site_name: '',
    notes: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const RECORDS_PER_PAGE = 30;

  useEffect(() => {
    fetchClockStatus();
    fetchAttendanceHistory();
  }, [employee.id]);

  async function fetchClockStatus() {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/employees/${employee.id}/attendance/status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setIsClockedIn(data.isClockedIn);
        if (data.isClockedIn) {
          setClockStatus(data.record);
        }
      }
    } catch (error) {
      console.error('Error fetching clock status:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchAttendanceHistory() {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/employees/${employee.id}/attendance`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setHistory(data);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  }

  async function handleClockIn() {
    setIsProcessing(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/employees/${employee.id}/attendance/clock-in`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          location,
          site_name: siteName || null
        })
      });

      if (response.ok) {
        const data = await response.json();
        setIsClockedIn(true);
        setClockStatus(data);
        setMessage({ type: 'success', text: 'Clocked in successfully' });
        setTimeout(() => setMessage(null), 3000);
        fetchAttendanceHistory();
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.error || 'Failed to clock in' });
      }
    } catch (error) {
      console.error('Error clocking in:', error);
      setMessage({ type: 'error', text: 'Failed to clock in' });
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleClockOut() {
    setIsProcessing(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/employees/${employee.id}/attendance/${clockStatus.id}/clock-out`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setIsClockedIn(false);
        setClockStatus(null);
        setMessage({ type: 'success', text: data.message });
        setTimeout(() => setMessage(null), 3000);
        fetchAttendanceHistory();
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.error || 'Failed to clock out' });
      }
    } catch (error) {
      console.error('Error clocking out:', error);
      setMessage({ type: 'error', text: 'Failed to clock out' });
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleRequestCorrection() {
    if (!correctionData.requested_clock_in || !correctionData.reason) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' });
      return;
    }

    setIsProcessing(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/employees/${employee.id}/attendance/${selectedRecord.id}/correction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(correctionData)
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Correction request submitted' });
        setShowCorrectionForm(false);
        setCorrectionData({ requested_clock_in: '', requested_clock_out: '', reason: '' });
        setSelectedRecord(null);
        setTimeout(() => setMessage(null), 3000);
        fetchAttendanceHistory();
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.error || 'Failed to submit correction' });
      }
    } catch (error) {
      console.error('Error submitting correction:', error);
      setMessage({ type: 'error', text: 'Failed to submit correction' });
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleAddRetrospective() {
    if (!retrospectiveData.work_date || !retrospectiveData.clock_in_time || !retrospectiveData.clock_out_time || !retrospectiveData.location) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' });
      return;
    }

    setIsProcessing(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/employees/${employee.id}/attendance/retrospective`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(retrospectiveData)
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Retrospective attendance added successfully' });
        setShowRetrospectiveForm(false);
        setRetrospectiveData({
          work_date: '',
          clock_in_time: '',
          clock_out_time: '',
          location: 'Head Office',
          site_name: '',
          notes: ''
        });
        setTimeout(() => setMessage(null), 3000);
        fetchAttendanceHistory();
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.error || 'Failed to add attendance' });
      }
    } catch (error) {
      console.error('Error adding retrospective attendance:', error);
      setMessage({ type: 'error', text: 'Failed to add attendance' });
    } finally {
      setIsProcessing(false);
    }
  }

  function formatTime(isoTime) {
    if (!isoTime) return '--:--';
    return new Date(isoTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }

  function formatDate(dateString) {
    if (!dateString) return '--';
    return new Date(dateString + 'T00:00:00').toLocaleDateString('en-GB');
  }

  if (isLoading) {
    return <div className="attendance-container"><p>Loading...</p></div>;
  }

  return (
    <div className="attendance-container">
      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      {/* Clock In/Out Section */}
      <div className="clock-section">
        {!isClockedIn ? (
          <div className="clock-out-state">
            <h3 style={{ marginBottom: '8px' }}>Good {new Date().getHours() < 12 ? 'Morning' : 'Afternoon'}, {employee.first_name}</h3>
            <p className="status-text">Today's Status: Not Clocked In</p>

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

            {(location === 'Customer Property' || location === 'Project / Site') && (
              <div className="form-group">
                <label>Site / Customer / Project Name (Optional)</label>
                <input
                  type="text"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  placeholder="Enter location details"
                />
              </div>
            )}

            <button
              onClick={handleClockIn}
              disabled={isProcessing}
              className="btn-clock-in"
            >
              {isProcessing ? 'Clocking In...' : 'CLOCK IN'}
            </button>
          </div>
        ) : (
          <div className="clock-in-state">
            <div className="status-badge">Clocked In</div>
            <p className="time-display">{formatTime(clockStatus?.clock_in_time)}</p>
            <p className="location-display">{clockStatus?.location}</p>
            {clockStatus?.site_name && <p className="site-name">{clockStatus.site_name}</p>}

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

      {/* Admin Retrospective Attendance Section */}
      {currentUser?.role === 'admin' && (
        <div className="retrospective-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3>Add Retrospective Attendance</h3>
            <button
              className="btn-add-retrospective"
              onClick={() => setShowRetrospectiveForm(!showRetrospectiveForm)}
            >
              {showRetrospectiveForm ? 'Cancel' : '+ Add Historical Record'}
            </button>
          </div>

          {showRetrospectiveForm && (
            <div className="retrospective-form">
              <div className="form-group">
                <label>Work Date * (between {employee.employment_start_date ? new Date(employee.employment_start_date).toLocaleDateString('en-GB') : 'start date'} and today)</label>
                <input
                  type="date"
                  value={retrospectiveData.work_date}
                  onChange={(e) => setRetrospectiveData({ ...retrospectiveData, work_date: e.target.value })}
                  min={employee.employment_start_date}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Clock In Time *</label>
                  <input
                    type="time"
                    value={retrospectiveData.clock_in_time.substring(11, 16) || ''}
                    onChange={(e) => {
                      const dateStr = retrospectiveData.work_date;
                      const timeStr = e.target.value;
                      if (dateStr && timeStr) {
                        setRetrospectiveData({
                          ...retrospectiveData,
                          clock_in_time: `${dateStr}T${timeStr}:00`
                        });
                      }
                    }}
                  />
                </div>

                <div className="form-group">
                  <label>Clock Out Time *</label>
                  <input
                    type="time"
                    value={retrospectiveData.clock_out_time.substring(11, 16) || ''}
                    onChange={(e) => {
                      const dateStr = retrospectiveData.work_date;
                      const timeStr = e.target.value;
                      if (dateStr && timeStr) {
                        setRetrospectiveData({
                          ...retrospectiveData,
                          clock_out_time: `${dateStr}T${timeStr}:00`
                        });
                      }
                    }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Work Location *</label>
                <select value={retrospectiveData.location} onChange={(e) => setRetrospectiveData({ ...retrospectiveData, location: e.target.value })}>
                  <option value="Head Office">Head Office</option>
                  <option value="Home">Home</option>
                  <option value="Customer Property">Customer Property</option>
                  <option value="Project / Site">Project / Site</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {(retrospectiveData.location === 'Customer Property' || retrospectiveData.location === 'Project / Site') && (
                <div className="form-group">
                  <label>Site / Customer / Project Name (Optional)</label>
                  <input
                    type="text"
                    value={retrospectiveData.site_name}
                    onChange={(e) => setRetrospectiveData({ ...retrospectiveData, site_name: e.target.value })}
                    placeholder="Enter location details"
                  />
                </div>
              )}

              <div className="form-group">
                <label>Notes (Optional)</label>
                <textarea
                  value={retrospectiveData.notes}
                  onChange={(e) => setRetrospectiveData({ ...retrospectiveData, notes: e.target.value })}
                  placeholder="Add any notes about this attendance record"
                  rows="2"
                />
              </div>

              <div className="form-actions">
                <button
                  className="btn-submit"
                  onClick={handleAddRetrospective}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Adding...' : 'Add Attendance Record'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* History Section */}
      <div className="history-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0 }}>Attendance History</h3>
          {history.length > 0 && (
            <span style={{ fontSize: '13px', color: '#7F8C8D' }}>
              Total: {history.length} records
            </span>
          )}
        </div>

        {history.length === 0 ? (
          <p className="empty-message">No attendance records yet</p>
        ) : (
          <>
            <div className="history-table-wrapper">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Clock In</th>
                    <th>Clock Out</th>
                    <th>Location</th>
                    <th>Hours</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const sortedHistory = [...history].sort((a, b) =>
                      new Date(b.work_date) - new Date(a.work_date)
                    );
                    const totalPages = Math.ceil(sortedHistory.length / RECORDS_PER_PAGE);
                    const startIdx = (currentPage - 1) * RECORDS_PER_PAGE;
                    const endIdx = startIdx + RECORDS_PER_PAGE;
                    const paginatedRecords = sortedHistory.slice(startIdx, endIdx);

                    return paginatedRecords.map(record => (
                      <tr key={record.id}>
                        <td>{formatDate(record.work_date)}</td>
                        <td>{formatTime(record.clock_in_time)}</td>
                        <td>{formatTime(record.clock_out_time)}</td>
                        <td>{record.location}</td>
                        <td>{record.total_hours ? record.total_hours.toFixed(2) : '--'}</td>
                        <td><span className={`status ${record.status}`}>{record.status}</span></td>
                        <td>
                          {record.status === 'incomplete' && (
                            <button
                              className="btn-correction"
                              onClick={() => {
                                setSelectedRecord(record);
                                setCorrectionData({
                                  requested_clock_in: record.clock_in_time || '',
                                  requested_clock_out: record.clock_out_time || '',
                                  reason: ''
                                });
                                setShowCorrectionForm(true);
                              }}
                            >
                              Request Correction
                            </button>
                          )}
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {(() => {
              const totalPages = Math.ceil(history.length / RECORDS_PER_PAGE);
              return (
                <div className="pagination-controls" style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    style={{
                      padding: '10px 16px',
                      background: currentPage === 1 ? '#E9ECEF' : '#FFFFFF',
                      color: currentPage === 1 ? '#BDC3C7' : '#2C3E50',
                      border: '1px solid #E0E0E0',
                      borderRadius: '6px',
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: 600,
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                      if (currentPage > 1) e.target.style.background = '#F8F9FA';
                    }}
                    onMouseOut={(e) => {
                      if (currentPage > 1) e.target.style.background = '#FFFFFF';
                    }}
                  >
                    ← Previous
                  </button>

                  <span style={{ fontSize: '14px', color: '#2C3E50', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    Page {currentPage} of {totalPages}
                  </span>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    style={{
                      padding: '10px 16px',
                      background: currentPage === totalPages ? '#E9ECEF' : '#FFFFFF',
                      color: currentPage === totalPages ? '#BDC3C7' : '#2C3E50',
                      border: '1px solid #E0E0E0',
                      borderRadius: '6px',
                      cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: 600,
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                      if (currentPage < totalPages) e.target.style.background = '#F8F9FA';
                    }}
                    onMouseOut={(e) => {
                      if (currentPage < totalPages) e.target.style.background = '#FFFFFF';
                    }}
                  >
                    Next →
                  </button>
                </div>
              );
            })()}
          </>
        )}
      </div>

      {/* Correction Form Modal */}
      {showCorrectionForm && selectedRecord && (
        <div className="modal-overlay" onClick={() => setShowCorrectionForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: '20px' }}>Request Attendance Correction</h3>

            <div className="form-group">
              <label>Original Clock In Time</label>
              <input
                type="text"
                value={formatTime(selectedRecord.clock_in_time)}
                disabled
                className="read-only"
              />
            </div>

            <div className="form-group">
              <label>Original Clock Out Time</label>
              <input
                type="text"
                value={formatTime(selectedRecord.clock_out_time)}
                disabled
                className="read-only"
              />
            </div>

            <div className="form-group">
              <label>Requested Clock In Time *</label>
              <input
                type="datetime-local"
                value={correctionData.requested_clock_in.substring(0, 16)}
                onChange={(e) => setCorrectionData({
                  ...correctionData,
                  requested_clock_in: new Date(e.target.value).toISOString()
                })}
              />
            </div>

            <div className="form-group">
              <label>Requested Clock Out Time</label>
              <input
                type="datetime-local"
                value={correctionData.requested_clock_out?.substring(0, 16) || ''}
                onChange={(e) => setCorrectionData({
                  ...correctionData,
                  requested_clock_out: e.target.value ? new Date(e.target.value).toISOString() : ''
                })}
              />
            </div>

            <div className="form-group">
              <label>Reason for Correction *</label>
              <textarea
                value={correctionData.reason}
                onChange={(e) => setCorrectionData({ ...correctionData, reason: e.target.value })}
                placeholder="Explain why this correction is needed"
                rows="3"
              />
            </div>

            <div className="form-actions">
              <button
                className="btn-submit"
                onClick={handleRequestCorrection}
                disabled={isProcessing}
              >
                {isProcessing ? 'Submitting...' : 'Submit Request'}
              </button>
              <button
                className="btn-cancel"
                onClick={() => setShowCorrectionForm(false)}
                disabled={isProcessing}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AttendanceTab;


