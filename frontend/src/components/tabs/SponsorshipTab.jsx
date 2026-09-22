import { useState, useEffect } from 'react';
import '../tabs/SponsorshipTab.css';

function SponsorshipTab({ employee, currentUser, isReadOnly = false }) {
  const [sponsorship, setSponsor] = useState(null);
  const [rtwChecks, setRtwChecks] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Only admins can edit sponsorship information
  const canEdit = currentUser?.role === 'admin' && !isReadOnly;

  const [editingCos, setEditingCos] = useState(false);
  const [editingImmigration, setEditingImmigration] = useState(false);
  const [showRtwForm, setShowRtwForm] = useState(false);
  const [sponsoredWorker, setSponsoredWorker] = useState(false);

  const [cosData, setCosData] = useState({
    cos_reference_number: '', sponsorship_route: '', soc_occupation_code: '', job_title_on_cos: '',
    salary_on_cos: '', contracted_hours_on_cos: '', work_location_on_cos: 'Head Office', cos_assigned_date: '',
    cos_end_date: '', cos_notes: ''
  });

  const [immigrationData, setImmigrationData] = useState({
    visa_permission_type: '', visa_start_date: '', visa_expiry_date: '', immigration_status: '',
    passport_number: '', passport_country: '', passport_expiry_date: '', immigration_notes: ''
  });

  const [rtwData, setRtwData] = useState({
    check_date: '', check_type: 'Home Office online check', checked_by: '', outcome: 'Pass',
    immigration_permission_expiry: '', follow_up_required: false, follow_up_due_date: '', notes: ''
  });

  useEffect(() => { fetchSponsorshipData(); }, [employee.id]);

  async function fetchSponsorshipData() {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/employees/${employee.id}/sponsorship`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Sponsorship data:', data);
        console.log('sponsored_worker value:', data.sponsorship?.sponsored_worker, 'type:', typeof data.sponsorship?.sponsored_worker);
        setSponsor(data.sponsorship);
        setRtwChecks(data.rtwChecks || []);
        setAlerts(data.alerts || []);
        const sponsored = Boolean(data.sponsorship?.sponsored_worker);
        console.log('Setting sponsoredWorker to:', sponsored);
        setSponsoredWorker(sponsored);

        if (data.sponsorship) {
          setCosData({
            cos_reference_number: data.sponsorship.cos_reference_number || '', sponsorship_route: data.sponsorship.sponsorship_route || '',
            soc_occupation_code: data.sponsorship.soc_occupation_code || '', job_title_on_cos: data.sponsorship.job_title_on_cos || '',
            salary_on_cos: data.sponsorship.salary_on_cos || '', contracted_hours_on_cos: data.sponsorship.contracted_hours_on_cos || '',
            work_location_on_cos: data.sponsorship.work_location_on_cos || 'Head Office', cos_assigned_date: data.sponsorship.cos_assigned_date || '',
            cos_end_date: data.sponsorship.cos_end_date || '', cos_notes: data.sponsorship.cos_notes || ''
          });
          setImmigrationData({
            visa_permission_type: data.sponsorship.visa_permission_type || '', visa_start_date: data.sponsorship.visa_start_date || '',
            visa_expiry_date: data.sponsorship.visa_expiry_date || '', immigration_status: data.sponsorship.immigration_status || '',
            passport_number: data.sponsorship.passport_number || '', passport_country: data.sponsorship.passport_country || '',
            passport_expiry_date: data.sponsorship.passport_expiry_date || '', immigration_notes: data.sponsorship.immigration_notes || ''
          });
        }
      } else {
        console.error('Fetch failed:', response.status, response.statusText);
      }
    } catch (error) { console.error('Error fetching sponsorship:', error); }
    finally { setIsLoading(false); }
  }

  async function handleToggleSponsoredWorker() {
    setIsProcessing(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/employees/${employee.id}/sponsorship/toggle`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ sponsored_worker: !sponsoredWorker })
      });
      if (response.ok) {
        setSponsoredWorker(!sponsoredWorker);
        setMessage({ type: 'success', text: 'Sponsored worker status updated' });
        setTimeout(() => setMessage(null), 3000);
        fetchSponsorshipData();
      } else { setMessage({ type: 'error', text: 'Failed to update' }); }
    } catch (error) { setMessage({ type: 'error', text: 'Failed to update' }); }
    finally { setIsProcessing(false); }
  }

  async function handleSaveCos() {
    setIsProcessing(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/employees/${employee.id}/sponsorship/cos`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(cosData)
      });
      if (response.ok) {
        setMessage({ type: 'success', text: 'CoS updated' });
        setEditingCos(false);
        setTimeout(() => setMessage(null), 3000);
        fetchSponsorshipData();
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: `Failed to save: ${error.error || 'Unknown error'}` });
      }
    } catch (error) {
      setMessage({ type: 'error', text: `Failed to save: ${error.message}` });
    }
    finally { setIsProcessing(false); }
  }

  async function handleSaveImmigration() {
    setIsProcessing(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/employees/${employee.id}/sponsorship/immigration`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(immigrationData)
      });
      if (response.ok) {
        setMessage({ type: 'success', text: 'Immigration updated' });
        setEditingImmigration(false);
        setTimeout(() => setMessage(null), 3000);
        fetchSponsorshipData();
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: `Failed to save: ${error.error || 'Unknown error'}` });
      }
    } catch (error) {
      setMessage({ type: 'error', text: `Failed to save: ${error.message}` });
    }
    finally { setIsProcessing(false); }
  }

  async function handleAddRtwCheck() {
    if (!rtwData.check_date || !rtwData.checked_by || !rtwData.outcome) {
      setMessage({ type: 'error', text: 'Fill all required fields' }); return;
    }
    if (rtwData.follow_up_required && !rtwData.follow_up_due_date) {
      setMessage({ type: 'error', text: 'Follow-up due date required' }); return;
    }
    setIsProcessing(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/employees/${employee.id}/sponsorship/rtw-checks`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(rtwData)
      });
      if (response.ok) {
        setMessage({ type: 'success', text: 'RTW check added' });
        setShowRtwForm(false);
        setRtwData({ check_date: '', check_type: 'Home Office online check', checked_by: '', outcome: 'Pass',
          immigration_permission_expiry: '', follow_up_required: false, follow_up_due_date: '', notes: '' });
        setTimeout(() => setMessage(null), 3000);
        fetchSponsorshipData();
      } else { setMessage({ type: 'error', text: 'Failed to add' }); }
    } catch (error) { setMessage({ type: 'error', text: 'Failed to add' }); }
    finally { setIsProcessing(false); }
  }

  function formatDate(d) { return d ? new Date(d).toLocaleDateString('en-GB') : '—'; }
  function getDaysRemaining(d) {
    if (!d) return null;
    return Math.ceil((new Date(d) - new Date()) / (1000 * 60 * 60 * 24));
  }
  function getStatusBadge(d, warn) {
    const days = getDaysRemaining(d);
    if (!days) return null;
    if (days < 0) return <span className="badge badge-expired">Expired</span>;
    if (days <= warn) return <span className="badge badge-warning">Expiring Soon — {days} days</span>;
    return <span className="badge badge-valid">Valid</span>;
  }

  if (isLoading) return <div className="sponsorship-container"><p>Loading...</p></div>;

  if (!sponsoredWorker) {
    return (
      <div className="sponsorship-container">
        <div className="sponsored-toggle">
          <input type="checkbox" checked={sponsoredWorker} onChange={handleToggleSponsoredWorker} disabled={isProcessing || !canEdit} />
          <label>Sponsored Worker {!canEdit && <span style={{ fontSize: '0.85em', color: '#7F8C8D' }}>(read-only)</span>}</label>
        </div>
        <p className="not-sponsored">This employee is not marked as a sponsored worker.</p>
      </div>
    );
  }

  return (
    <div className="sponsorship-container">
      {message && <div className={`message ${message.type}`}>{message.text}</div>}

      <div className="sponsored-toggle">
        <input type="checkbox" checked={sponsoredWorker} onChange={handleToggleSponsoredWorker} disabled={isProcessing || !canEdit} />
        <label>Sponsored Worker {!canEdit && <span style={{ fontSize: '0.85em', color: '#7F8C8D' }}>(read-only)</span>}</label>
      </div>

      {alerts.length > 0 && (
        <div className="alerts-section">
          <h3>Compliance Alerts</h3>
          <div className="alerts-grid">
            {alerts.map(alert => (
              <div key={alert.id} className={`alert-card alert-${alert.severity.toLowerCase()}`}>
                <h4>{alert.alert_type}</h4>
                <p>{alert.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card cos-section">
        <div className="card-header">
          <h3>Certificate of Sponsorship</h3>
          {getStatusBadge(cosData.cos_end_date, 30)}
        </div>
        {!editingCos ? (
          <div>
            <div className="field-grid">
              <div className="field"><label>CoS Reference</label><p>{cosData.cos_reference_number || '—'}</p></div>
              <div className="field"><label>Sponsorship Route</label><p>{cosData.sponsorship_route || '—'}</p></div>
              <div className="field"><label>SOC Code</label><p>{cosData.soc_occupation_code || '—'}</p></div>
              <div className="field"><label>Job Title</label><p>{cosData.job_title_on_cos || '—'}</p></div>
              <div className="field"><label>Salary</label><p>{cosData.salary_on_cos ? `£${cosData.salary_on_cos}` : '—'}</p></div>
              <div className="field"><label>Weekly Hours</label><p>{cosData.contracted_hours_on_cos || '—'}</p></div>
              <div className="field"><label>Location</label><p>{cosData.work_location_on_cos || '—'}</p></div>
              <div className="field"><label>Assigned Date</label><p>{formatDate(cosData.cos_assigned_date)}</p></div>
              <div className="field"><label>End Date</label><p>{formatDate(cosData.cos_end_date)}</p></div>
            </div>
            {cosData.cos_notes && <div className="notes-section"><label>Notes</label><p>{cosData.cos_notes}</p></div>}
            {canEdit && <button className="btn-edit" onClick={() => setEditingCos(true)}>Edit</button>}
          </div>
        ) : (
          <div>
            <div className="form-grid">
              <div className="form-group"><label>CoS Reference</label><input type="text" value={cosData.cos_reference_number} onChange={(e) => setCosData({ ...cosData, cos_reference_number: e.target.value })} /></div>
              <div className="form-group"><label>Sponsorship Route</label><input type="text" value={cosData.sponsorship_route} onChange={(e) => setCosData({ ...cosData, sponsorship_route: e.target.value })} /></div>
              <div className="form-group"><label>SOC Code</label><input type="text" value={cosData.soc_occupation_code} onChange={(e) => setCosData({ ...cosData, soc_occupation_code: e.target.value })} /></div>
              <div className="form-group"><label>Job Title</label><input type="text" value={cosData.job_title_on_cos} onChange={(e) => setCosData({ ...cosData, job_title_on_cos: e.target.value })} /></div>
              <div className="form-group"><label>Salary (£)</label><input type="number" value={cosData.salary_on_cos} onChange={(e) => setCosData({ ...cosData, salary_on_cos: e.target.value })} /></div>
              <div className="form-group"><label>Weekly Hours</label><input type="number" value={cosData.contracted_hours_on_cos} onChange={(e) => setCosData({ ...cosData, contracted_hours_on_cos: e.target.value })} /></div>
              <div className="form-group"><label>Location</label><select value={cosData.work_location_on_cos} onChange={(e) => setCosData({ ...cosData, work_location_on_cos: e.target.value })}><option value="Head Office">Head Office</option><option value="Home">Home</option><option value="Customer Property">Customer Property</option><option value="Project / Site">Project / Site</option><option value="Other">Other</option></select></div>
              <div className="form-group"><label>Assigned Date</label><input type="date" value={cosData.cos_assigned_date} onChange={(e) => setCosData({ ...cosData, cos_assigned_date: e.target.value })} /></div>
              <div className="form-group"><label>End Date</label><input type="date" value={cosData.cos_end_date} onChange={(e) => setCosData({ ...cosData, cos_end_date: e.target.value })} /></div>
            </div>
            <div className="form-group full-width"><label>Notes</label><textarea value={cosData.cos_notes} onChange={(e) => setCosData({ ...cosData, cos_notes: e.target.value })} rows="2" /></div>
            <div className="form-actions">
              <button className="btn-save" onClick={handleSaveCos} disabled={isProcessing}>Save</button>
              <button className="btn-cancel" onClick={() => setEditingCos(false)}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      <div className="card immigration-section">
        <div className="card-header">
          <h3>Immigration Information</h3>
          {getStatusBadge(immigrationData.visa_expiry_date, 90)}
        </div>
        {!editingImmigration ? (
          <div>
            <div className="field-grid">
              <div className="field"><label>Visa Type</label><p>{immigrationData.visa_permission_type || '—'}</p></div>
              <div className="field"><label>Visa Start</label><p>{formatDate(immigrationData.visa_start_date)}</p></div>
              <div className="field"><label>Visa Expiry</label><p>{formatDate(immigrationData.visa_expiry_date)}</p></div>
              <div className="field"><label>Immigration Status</label><p>{immigrationData.immigration_status || '—'}</p></div>
              <div className="field"><label>Passport Number</label><p>{immigrationData.passport_number || '—'}</p></div>
              <div className="field"><label>Passport Country</label><p>{immigrationData.passport_country || '—'}</p></div>
              <div className="field"><label>Passport Expiry</label><p>{formatDate(immigrationData.passport_expiry_date)}</p></div>
            </div>
            {immigrationData.immigration_notes && <div className="notes-section"><label>Notes</label><p>{immigrationData.immigration_notes}</p></div>}
            {canEdit && <button className="btn-edit" onClick={() => setEditingImmigration(true)}>Edit</button>}
          </div>
        ) : (
          <div>
            <div className="form-grid">
              <div className="form-group"><label>Visa Type</label><input type="text" value={immigrationData.visa_permission_type} onChange={(e) => setImmigrationData({ ...immigrationData, visa_permission_type: e.target.value })} /></div>
              <div className="form-group"><label>Visa Start</label><input type="date" value={immigrationData.visa_start_date} onChange={(e) => setImmigrationData({ ...immigrationData, visa_start_date: e.target.value })} /></div>
              <div className="form-group"><label>Visa Expiry</label><input type="date" value={immigrationData.visa_expiry_date} onChange={(e) => setImmigrationData({ ...immigrationData, visa_expiry_date: e.target.value })} /></div>
              <div className="form-group"><label>Immigration Status</label><input type="text" value={immigrationData.immigration_status} onChange={(e) => setImmigrationData({ ...immigrationData, immigration_status: e.target.value })} /></div>
              <div className="form-group"><label>Passport Number</label><input type="text" value={immigrationData.passport_number} onChange={(e) => setImmigrationData({ ...immigrationData, passport_number: e.target.value })} /></div>
              <div className="form-group"><label>Passport Country</label><input type="text" value={immigrationData.passport_country} onChange={(e) => setImmigrationData({ ...immigrationData, passport_country: e.target.value })} /></div>
              <div className="form-group"><label>Passport Expiry</label><input type="date" value={immigrationData.passport_expiry_date} onChange={(e) => setImmigrationData({ ...immigrationData, passport_expiry_date: e.target.value })} /></div>
            </div>
            <div className="form-group full-width"><label>Notes</label><textarea value={immigrationData.immigration_notes} onChange={(e) => setImmigrationData({ ...immigrationData, immigration_notes: e.target.value })} rows="2" /></div>
            <div className="form-actions">
              <button className="btn-save" onClick={handleSaveImmigration} disabled={isProcessing}>Save</button>
              <button className="btn-cancel" onClick={() => setEditingImmigration(false)}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      <div className="card rtw-section">
        <div className="card-header">
          <h3>Right to Work Checks</h3>
          {canEdit && <button className="btn-add-rtw" onClick={() => setShowRtwForm(!showRtwForm)}>{showRtwForm ? 'Cancel' : '+ Add Check'}</button>}
        </div>

        {showRtwForm && (
          <div className="rtw-form">
            <div className="form-grid">
              <div className="form-group"><label>Check Date *</label><input type="date" value={rtwData.check_date} onChange={(e) => setRtwData({ ...rtwData, check_date: e.target.value })} /></div>
              <div className="form-group"><label>Type *</label><select value={rtwData.check_type} onChange={(e) => setRtwData({ ...rtwData, check_type: e.target.value })}><option>Home Office online check</option><option>Manual document check</option><option>Employer Checking Service</option><option>Other</option></select></div>
              <div className="form-group"><label>Checked By *</label><input type="text" value={rtwData.checked_by} onChange={(e) => setRtwData({ ...rtwData, checked_by: e.target.value })} /></div>
              <div className="form-group"><label>Outcome *</label><select value={rtwData.outcome} onChange={(e) => setRtwData({ ...rtwData, outcome: e.target.value })}><option>Pass</option><option>Fail</option><option>Other</option></select></div>
              <div className="form-group"><label>Expiry</label><input type="date" value={rtwData.immigration_permission_expiry} onChange={(e) => setRtwData({ ...rtwData, immigration_permission_expiry: e.target.value })} /></div>
              <div className="form-group checkbox-group"><label><input type="checkbox" checked={rtwData.follow_up_required} onChange={(e) => setRtwData({ ...rtwData, follow_up_required: e.target.checked })} /> Follow-up</label></div>
              {rtwData.follow_up_required && <div className="form-group"><label>Due Date *</label><input type="date" value={rtwData.follow_up_due_date} onChange={(e) => setRtwData({ ...rtwData, follow_up_due_date: e.target.value })} /></div>}
            </div>
            <div className="form-group full-width"><label>Notes</label><textarea value={rtwData.notes} onChange={(e) => setRtwData({ ...rtwData, notes: e.target.value })} rows="2" /></div>
            <div className="form-actions"><button className="btn-save" onClick={handleAddRtwCheck} disabled={isProcessing}>Add</button></div>
          </div>
        )}

        {rtwChecks.length === 0 ? (
          <p className="empty-message">No RTW checks recorded</p>
        ) : (
          <div className="rtw-table-wrapper">
            <table className="rtw-table">
              <thead><tr><th>Date</th><th>Type</th><th>Checked By</th><th>Outcome</th><th>Follow-up</th></tr></thead>
              <tbody>{rtwChecks.map(c => <tr key={c.id}><td>{formatDate(c.check_date)}</td><td>{c.check_type}</td><td>{c.checked_by}</td><td><span className={`outcome-badge outcome-${c.outcome.toLowerCase()}`}>{c.outcome}</span></td><td>{c.follow_up_required ? formatDate(c.follow_up_due_date) : '—'}</td></tr>)}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default SponsorshipTab;


