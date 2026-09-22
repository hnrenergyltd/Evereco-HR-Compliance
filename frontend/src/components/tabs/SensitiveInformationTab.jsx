import { useState, useEffect } from 'react';
import '../tabs/SensitiveInformationTab.css';

function SensitiveInformationTab({
  employee,
  currentUser,
  isReadOnly = false,
  activeTab,
  onShowDeleteModal = () => {},
  showDeleteModal = false,
  isDeleting = false,
  onDeleteConfirm = () => {},
  onDeleteCancel = () => {}
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [sensitiveData, setSensitiveData] = useState(null);
  const [formData, setFormData] = useState({
    tax_code: '',
    ni_number: '',
    passport_number: '',
    passport_country_of_issue: '',
    passport_expiry_date: '',
    driving_licence_number: '',
    driving_licence_country_of_issue: '',
    driving_licence_class: '',
    driving_licence_expiry_date: '',
    dbs_initial_check_conducted: false,
    dbs_check_conducted: false,
    dbs_certificate_number: '',
    right_to_work_status: '',
    leaving_date: '',
    reason_for_termination: ''
  });

  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    fetchSensitiveData();
  }, [employee.id]);

  async function fetchSensitiveData() {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/employees/${employee.id}/sensitive`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.status === 404) {
        setSensitiveData(null);
        setFormData(prev => ({ ...prev }));
      } else if (response.ok) {
        const data = await response.json();
        setSensitiveData(data);
        setFormData(data);
      }
    } catch (error) {
      console.error('Error fetching sensitive data:', error);
      setMessage({ type: 'error', text: 'Failed to load sensitive information' });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/employees/${employee.id}/sensitive`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const data = await response.json();
        setSensitiveData(data);
        setIsEditing(false);
        setMessage({ type: 'success', text: 'Sensitive information saved successfully' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.error || 'Failed to save sensitive information' });
      }
    } catch (error) {
      console.error('Error saving sensitive data:', error);
      setMessage({ type: 'error', text: 'Failed to save sensitive information' });
    } finally {
      setIsSaving(false);
    }
  }

  function handleCancel() {
    setFormData(sensitiveData || {
      tax_code: '',
      ni_number: '',
      passport_number: '',
      passport_country_of_issue: '',
      passport_expiry_date: '',
      driving_licence_number: '',
      driving_licence_country_of_issue: '',
      driving_licence_class: '',
      driving_licence_expiry_date: '',
      dbs_initial_check_conducted: false,
      dbs_check_conducted: false,
      dbs_certificate_number: '',
      right_to_work_status: '',
      leaving_date: '',
      reason_for_termination: ''
    });
    setIsEditing(false);
    setMessage(null);
  }

  function handleInputChange(e) {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  }

  if (!isAdmin) {
    return (
      <div className="card">
        <h3>Sensitive Information</h3>
        <div style={{ marginTop: '15px', color: 'var(--text-light)' }}>
          <p>You do not have permission to access this information.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="card">
        <h3>Sensitive Information</h3>
        <p style={{ marginTop: '15px', color: 'var(--text-light)' }}>Loading...</p>
      </div>
    );
  }

  return (
    <div className="sensitive-info-container">
      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      {!isEditing && (
        <div style={{ marginBottom: '20px' }}>
          {isAdmin && (
            <button
              onClick={() => setIsEditing(true)}
              className="btn-primary"
              style={{
                padding: '8px 16px',
                borderRadius: '4px',
                border: 'none',
                background: 'var(--secondary)',
                color: 'white',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              Edit Information
            </button>
          )}
        </div>
      )}

      <form onSubmit={handleSave}>
        {/* Tax Section */}
        <div className="sensitive-section">
          <h4 className="section-title">Tax Information</h4>
          <div className="form-group">
            <label>Tax Code</label>
            {isEditing ? (
              <input
                type="text"
                name="tax_code"
                value={formData.tax_code || ''}
                onChange={handleInputChange}
                placeholder="e.g., 1257L"
              />
            ) : (
              <div className="read-only-field">{sensitiveData?.tax_code || 'Not provided'}</div>
            )}
          </div>
        </div>

        {/* National Insurance Section */}
        <div className="sensitive-section">
          <h4 className="section-title">National Insurance</h4>
          <div className="form-group">
            <label>NI Number</label>
            {isEditing ? (
              <input
                type="text"
                name="ni_number"
                value={formData.ni_number || ''}
                onChange={handleInputChange}
                placeholder="XX 99 99 99 X"
              />
            ) : (
              <div className="read-only-field">{sensitiveData?.ni_number || 'Not provided'}</div>
            )}
          </div>
        </div>

        {/* Passport Section */}
        <div className="sensitive-section">
          <h4 className="section-title">Passport</h4>
          <div className="form-row">
            <div className="form-group">
              <label>Passport Number</label>
              {isEditing ? (
                <input
                  type="text"
                  name="passport_number"
                  value={formData.passport_number || ''}
                  onChange={handleInputChange}
                  placeholder="Enter passport number"
                />
              ) : (
                <div className="read-only-field">{sensitiveData?.passport_number || 'Not provided'}</div>
              )}
            </div>
            <div className="form-group">
              <label>Country of Issue</label>
              {isEditing ? (
                <input
                  type="text"
                  name="passport_country_of_issue"
                  value={formData.passport_country_of_issue || ''}
                  onChange={handleInputChange}
                  placeholder="e.g., United Kingdom"
                />
              ) : (
                <div className="read-only-field">{sensitiveData?.passport_country_of_issue || 'Not provided'}</div>
              )}
            </div>
            <div className="form-group">
              <label>Expiry Date</label>
              {isEditing ? (
                <input
                  type="date"
                  name="passport_expiry_date"
                  value={formData.passport_expiry_date || ''}
                  onChange={handleInputChange}
                />
              ) : (
                <div className="read-only-field">
                  {sensitiveData?.passport_expiry_date
                    ? new Date(sensitiveData.passport_expiry_date).toLocaleDateString()
                    : 'Not provided'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Driving Licence Section */}
        <div className="sensitive-section">
          <h4 className="section-title">Driving Licence</h4>
          <div className="form-row">
            <div className="form-group">
              <label>Licence Number</label>
              {isEditing ? (
                <input
                  type="text"
                  name="driving_licence_number"
                  value={formData.driving_licence_number || ''}
                  onChange={handleInputChange}
                  placeholder="Enter licence number"
                />
              ) : (
                <div className="read-only-field">{sensitiveData?.driving_licence_number || 'Not provided'}</div>
              )}
            </div>
            <div className="form-group">
              <label>Country of Issue</label>
              {isEditing ? (
                <input
                  type="text"
                  name="driving_licence_country_of_issue"
                  value={formData.driving_licence_country_of_issue || ''}
                  onChange={handleInputChange}
                  placeholder="e.g., United Kingdom"
                />
              ) : (
                <div className="read-only-field">{sensitiveData?.driving_licence_country_of_issue || 'Not provided'}</div>
              )}
            </div>
            <div className="form-group">
              <label>Licence Class</label>
              {isEditing ? (
                <input
                  type="text"
                  name="driving_licence_class"
                  value={formData.driving_licence_class || ''}
                  onChange={handleInputChange}
                  placeholder="e.g., B, D1"
                />
              ) : (
                <div className="read-only-field">{sensitiveData?.driving_licence_class || 'Not provided'}</div>
              )}
            </div>
            <div className="form-group">
              <label>Expiry Date</label>
              {isEditing ? (
                <input
                  type="date"
                  name="driving_licence_expiry_date"
                  value={formData.driving_licence_expiry_date || ''}
                  onChange={handleInputChange}
                />
              ) : (
                <div className="read-only-field">
                  {sensitiveData?.driving_licence_expiry_date
                    ? new Date(sensitiveData.driving_licence_expiry_date).toLocaleDateString()
                    : 'Not provided'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* DBS Check Section */}
        <div className="sensitive-section">
          <h4 className="section-title">DBS Check</h4>
          <div className="form-row">
            <div className="form-group checkbox">
              <label>
                <input
                  type="checkbox"
                  name="dbs_initial_check_conducted"
                  checked={formData.dbs_initial_check_conducted || false}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                />
                DBS Initial Check Conducted
              </label>
            </div>
            <div className="form-group checkbox">
              <label>
                <input
                  type="checkbox"
                  name="dbs_check_conducted"
                  checked={formData.dbs_check_conducted || false}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                />
                DBS Check Conducted
              </label>
            </div>
            <div className="form-group">
              <label>DBS Certificate Number</label>
              {isEditing ? (
                <input
                  type="text"
                  name="dbs_certificate_number"
                  value={formData.dbs_certificate_number || ''}
                  onChange={handleInputChange}
                  placeholder="12 digits"
                  maxLength="12"
                />
              ) : (
                <div className="read-only-field">{sensitiveData?.dbs_certificate_number || 'Not provided'}</div>
              )}
            </div>
          </div>
        </div>

        {/* Right to Work Section */}
        <div className="sensitive-section">
          <h4 className="section-title">Right to Work</h4>
          <div className="form-group">
            <label>Right to Work Status</label>
            {isEditing ? (
              <select
                name="right_to_work_status"
                value={formData.right_to_work_status || ''}
                onChange={handleInputChange}
              >
                <option value="">Select status</option>
                <option value="Settled">Settled</option>
                <option value="Pre-settled">Pre-settled</option>
                <option value="Not declared">Not declared</option>
              </select>
            ) : (
              <div className="read-only-field">{sensitiveData?.right_to_work_status || 'Not provided'}</div>
            )}
          </div>
        </div>

        {/* Termination Section */}
        <div className="sensitive-section">
          <h4 className="section-title">Termination Information</h4>
          <div className="form-row">
            <div className="form-group">
              <label>Leaving Date (Optional)</label>
              {isEditing ? (
                <input
                  type="date"
                  name="leaving_date"
                  value={formData.leaving_date || ''}
                  onChange={handleInputChange}
                />
              ) : (
                <div className="read-only-field">
                  {sensitiveData?.leaving_date
                    ? new Date(sensitiveData.leaving_date).toLocaleDateString()
                    : 'Not provided'}
                </div>
              )}
            </div>
            <div className="form-group">
              <label>Reason for Termination (Optional)</label>
              {isEditing ? (
                <input
                  type="text"
                  name="reason_for_termination"
                  value={formData.reason_for_termination || ''}
                  onChange={handleInputChange}
                  placeholder="Enter reason if applicable"
                />
              ) : (
                <div className="read-only-field">{sensitiveData?.reason_for_termination || 'Not provided'}</div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {isEditing && (
          <div className="form-actions" style={{ marginTop: '24px' }}>
            <button
              type="submit"
              className="btn-save"
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              className="btn-cancel"
              onClick={handleCancel}
              disabled={isSaving}
            >
              Cancel
            </button>
          </div>
        )}

        {/* Delete Employee Button (Admin Only) */}
        {currentUser?.role === 'admin' && activeTab === 'sensitive' && (
          <div style={{
            marginTop: '40px',
            paddingTop: '24px',
            borderTop: '2px solid #E0E0E0'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h4 style={{ margin: 0, color: '#E74C3C', fontSize: '16px', fontWeight: 700 }}>
                  Danger Zone
                </h4>
                <p style={{ margin: '8px 0 0 0', color: '#7F8C8D', fontSize: '13px' }}>
                  Irreversible actions
                </p>
              </div>
              <button
                type="button"
                onClick={onShowDeleteModal}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#E74C3C',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#C0392B'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#E74C3C'}
              >
                🗑️ Delete Employee
              </button>
            </div>
          </div>
        )}
      </form>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && activeTab === 'sensitive' && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '12px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
            maxWidth: '420px',
            width: '90%',
            border: '2px solid #E74C3C',
            animation: 'slideUp 0.3s ease',
            maxHeight: '90vh',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch'
          }}>
            <div style={{
              padding: '24px 24px 16px',
              borderBottom: '1px solid #E0E0E0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#2C3E50' }}>
                Delete Employee
              </h2>
              <button
                onClick={onDeleteCancel}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '28px',
                  cursor: 'pointer',
                  color: '#7F8C8D'
                }}
              >
                ×
              </button>
            </div>
            <div style={{ padding: '24px', textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
              <p style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#2C3E50', lineHeight: 1.5 }}>
                Warning: This action cannot be undone. All employee records will be permanently deleted from the system.
              </p>
              <div style={{
                background: '#F8D7DA',
                border: '1px solid #F5C6CB',
                borderRadius: '6px',
                padding: '12px 14px',
                fontSize: '14px',
                color: '#721C24',
                marginTop: '16px'
              }}>
                Deleting: <strong>{employee.first_name} {employee.surname}</strong>
              </div>
            </div>
            <div style={{
              padding: '16px 24px 24px',
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={onDeleteCancel}
                disabled={isDeleting}
                style={{
                  padding: '10px 20px',
                  background: '#E9ECEF',
                  color: '#2C3E50',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                  opacity: isDeleting ? 0.6 : 1
                }}
              >
                Cancel
              </button>
              <button
                onClick={onDeleteConfirm}
                disabled={isDeleting}
                style={{
                  padding: '10px 20px',
                  background: '#E74C3C',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                  opacity: isDeleting ? 0.6 : 1
                }}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SensitiveInformationTab;

