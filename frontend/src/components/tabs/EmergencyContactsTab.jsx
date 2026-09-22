import { useState, useEffect } from 'react';
import '../tabs/EmergencyContactsTab.css';

function EmergencyContactsTab({ employee, currentUser, isReadOnly = false }) {
  const [contacts, setContacts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    relationship: '',
    mobile_number: '',
    other_telephone: '',
    email: '',
    address: '',
    notes: ''
  });

  const canManage = currentUser?.role === 'admin' || currentUser?.employee_id === employee.id;

  useEffect(() => {
    fetchContacts();
  }, [employee.id]);

  async function fetchContacts() {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/employees/${employee.id}/emergency-contacts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setContacts(data);
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
      setMessage({ type: 'error', text: 'Failed to load emergency contacts' });
    } finally {
      setIsLoading(false);
    }
  }

  function resetForm() {
    setFormData({
      name: '',
      relationship: '',
      mobile_number: '',
      other_telephone: '',
      email: '',
      address: '',
      notes: ''
    });
  }

  function handleInputChange(e) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setMessage(null);

    if (!formData.name || !formData.relationship || !formData.mobile_number) {
      setMessage({ type: 'error', text: 'Name, relationship, and mobile number are required' });
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const url = editingId
        ? `/api/employees/${employee.id}/emergency-contacts/${editingId}`
        : `/api/employees/${employee.id}/emergency-contacts`;

      const response = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const data = await response.json();
        if (editingId) {
          setContacts(contacts.map(c => c.id === editingId ? data : c));
          setEditingId(null);
        } else {
          setContacts([...contacts, data]);
        }
        resetForm();
        setIsAdding(false);
        setMessage({ type: 'success', text: 'Contact saved successfully' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.error || 'Failed to save contact' });
      }
    } catch (error) {
      console.error('Error saving contact:', error);
      setMessage({ type: 'error', text: 'Failed to save contact' });
    }
  }

  async function handleDelete(contactId) {
    if (!confirm('Are you sure you want to delete this emergency contact?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/employees/${employee.id}/emergency-contacts/${contactId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setContacts(contacts.filter(c => c.id !== contactId));
        setMessage({ type: 'success', text: 'Contact deleted successfully' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.error || 'Failed to delete contact' });
      }
    } catch (error) {
      console.error('Error deleting contact:', error);
      setMessage({ type: 'error', text: 'Failed to delete contact' });
    }
  }

  function handleEdit(contact) {
    setFormData(contact);
    setEditingId(contact.id);
    setIsAdding(true);
  }

  function handleCancel() {
    setIsAdding(false);
    setEditingId(null);
    resetForm();
    setMessage(null);
  }

  if (isLoading) {
    return (
      <div className="card">
        <h3>Emergency Contacts</h3>
        <p style={{ marginTop: '15px', color: 'var(--text-light)' }}>Loading...</p>
      </div>
    );
  }

  return (
    <div className="emergency-contacts-container">
      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      {!isAdding && contacts.length === 0 && (
        <div className="empty-state">
          <p style={{ color: 'var(--text-light)', marginBottom: '16px' }}>No emergency contacts added yet</p>
          {canManage && (
            <button
              onClick={() => setIsAdding(true)}
              className="btn-add-contact"
            >
              + Add Emergency Contact
            </button>
          )}
        </div>
      )}

      {contacts.length > 0 && (
        <div className="contacts-list">
          {contacts.map(contact => (
            <div key={contact.id} className="contact-card">
              <div className="contact-header">
                <div>
                  <h4 className="contact-name">{contact.name}</h4>
                  <p className="contact-relationship">{contact.relationship}</p>
                </div>
                {canManage && (
                  <div className="contact-actions">
                    <button
                      className="btn-edit"
                      onClick={() => handleEdit(contact)}
                      title="Edit"
                    >
                      Edit
                    </button>
                    <button
                      className="btn-delete"
                      onClick={() => handleDelete(contact.id)}
                      title="Delete"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>

              <div className="contact-details">
                <div className="detail-row">
                  <span className="label">Mobile:</span>
                  <span className="value">{contact.mobile_number}</span>
                </div>
                {contact.other_telephone && (
                  <div className="detail-row">
                    <span className="label">Other Telephone:</span>
                    <span className="value">{contact.other_telephone}</span>
                  </div>
                )}
                {contact.email && (
                  <div className="detail-row">
                    <span className="label">Email:</span>
                    <span className="value">{contact.email}</span>
                  </div>
                )}
                {contact.address && (
                  <div className="detail-row">
                    <span className="label">Address:</span>
                    <span className="value">{contact.address}</span>
                  </div>
                )}
                {contact.notes && (
                  <div className="detail-row">
                    <span className="label">Notes:</span>
                    <span className="value">{contact.notes}</span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {canManage && !isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              className="btn-add-contact"
              style={{ marginTop: '20px' }}
            >
              + Add Another Contact
            </button>
          )}
        </div>
      )}

      {isAdding && (
        <div className="add-contact-form">
          <h4 style={{ marginBottom: '20px' }}>
            {editingId ? 'Edit Emergency Contact' : 'Add Emergency Contact'}
          </h4>

          <form onSubmit={handleSave}>
            <div className="form-row">
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Full name"
                  required
                />
              </div>
              <div className="form-group">
                <label>Relationship *</label>
                <input
                  type="text"
                  name="relationship"
                  value={formData.relationship}
                  onChange={handleInputChange}
                  placeholder="e.g., Mother, Brother, Friend"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Mobile Number *</label>
                <input
                  type="tel"
                  name="mobile_number"
                  value={formData.mobile_number}
                  onChange={handleInputChange}
                  placeholder="e.g., +44 7123 456789"
                  required
                />
              </div>
              <div className="form-group">
                <label>Other Telephone (Optional)</label>
                <input
                  type="tel"
                  name="other_telephone"
                  value={formData.other_telephone}
                  onChange={handleInputChange}
                  placeholder="e.g., 020 1234 5678"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Email (Optional)</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="email@example.com"
                />
              </div>
              <div className="form-group">
                <label>Address (Optional)</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Full address"
                />
              </div>
            </div>

            <div className="form-group full-width">
              <label>Notes (Optional)</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Any additional notes"
                rows="3"
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-save">
                Save Contact
              </button>
              <button
                type="button"
                className="btn-cancel"
                onClick={handleCancel}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default EmergencyContactsTab;


