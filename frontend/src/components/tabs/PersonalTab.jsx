import { useState, useEffect } from 'react';
import PersonalInformation from '../FormSections/PersonalInformation';
import ContactDetails from '../FormSections/ContactDetails';
import AddressDetails from '../FormSections/AddressDetails';

function PersonalTab({ employee, currentUser, isReadOnly = false }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const canEdit = ((currentUser?.role === 'admin' || currentUser?.id === employee?.id) && !isReadOnly) && !isReadOnly;

  useEffect(() => {
    if (employee) {
      setFormData({
        title: employee.title || '',
        first_name: employee.first_name || '',
        middle_name: employee.middle_name || '',
        surname: employee.surname || '',
        preferred_name: employee.preferred_name || '',
        date_of_birth: employee.date_of_birth || '',
        nationality: employee.nationality || '',
        ni_number: employee.ni_number || '',
        personal_email: employee.personal_email || '',
        work_email: employee.work_email || '',
        mobile_number: employee.mobile_number || '',
        home_telephone: employee.home_telephone || '',
        address_line_1: employee.address_line_1 || '',
        address_line_2: employee.address_line_2 || '',
        city_town: employee.city_town || '',
        postcode: employee.postcode || '',
        country: employee.country || '',
      });
    }
  }, [employee]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.first_name?.trim()) newErrors.first_name = 'First name is required';
    if (!formData.surname?.trim()) newErrors.surname = 'Surname is required';

    if (formData.date_of_birth) {
      const dob = new Date(formData.date_of_birth);
      const today = new Date();
      if (dob > today) newErrors.date_of_birth = 'Date of birth cannot be in the future';
    }

    if (formData.personal_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.personal_email)) {
      newErrors.personal_email = 'Invalid email format';
    }

    if (formData.work_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.work_email)) {
      newErrors.work_email = 'Invalid email format';
    }

    if (formData.mobile_number && !/^[\d\s\-\+\(\)]+$/.test(formData.mobile_number)) {
      newErrors.mobile_number = 'Invalid phone format';
    }

    if (formData.home_telephone && !/^[\d\s\-\+\(\)]+$/.test(formData.home_telephone)) {
      newErrors.home_telephone = 'Invalid phone format';
    }

    if (formData.ni_number && !/^[A-Z]{2}\s?\d{2}\s?\d{2}\s?\d{2}\s?[A-Z]$/i.test(formData.ni_number)) {
      newErrors.ni_number = 'Invalid NI format (e.g., AB 12 34 56 C)';
    }

    if (formData.postcode && !/^[A-Z]{1,2}[0-9]{1,2}[A-Z]?\s?[0-9][A-Z]{2}$/i.test(formData.postcode)) {
      newErrors.postcode = 'Invalid UK postcode format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => { const newErrors = { ...prev }; delete newErrors[field]; return newErrors; });
    }
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/employees/${employee.id}/personal`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save');
      }

      // Fetch updated employee data to ensure persistence
      const updatedResponse = await fetch(`/api/employees/${employee.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (updatedResponse.ok) {
        const updatedEmployee = await updatedResponse.json();
        // Update formData with fresh data from backend
        setFormData({
          title: updatedEmployee.title || '',
          first_name: updatedEmployee.first_name || '',
          middle_name: updatedEmployee.middle_name || '',
          surname: updatedEmployee.surname || '',
          preferred_name: updatedEmployee.preferred_name || '',
          date_of_birth: updatedEmployee.date_of_birth || '',
          nationality: updatedEmployee.nationality || '',
          ni_number: updatedEmployee.ni_number || '',
          personal_email: updatedEmployee.personal_email || '',
          work_email: updatedEmployee.work_email || '',
          mobile_number: updatedEmployee.mobile_number || '',
          home_telephone: updatedEmployee.home_telephone || '',
          address_line_1: updatedEmployee.address_line_1 || '',
          address_line_2: updatedEmployee.address_line_2 || '',
          city_town: updatedEmployee.city_town || '',
          postcode: updatedEmployee.postcode || '',
          country: updatedEmployee.country || '',
        });
      }

      setMessage({ type: 'success', text: 'Changes saved successfully' });
      setIsEditing(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: `Error: ${error.message}` });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      title: employee.title || '',
      first_name: employee.first_name || '',
      middle_name: employee.middle_name || '',
      surname: employee.surname || '',
      preferred_name: employee.preferred_name || '',
      date_of_birth: employee.date_of_birth || '',
      nationality: employee.nationality || '',
      ni_number: employee.ni_number || '',
      personal_email: employee.personal_email || '',
      work_email: employee.work_email || '',
      mobile_number: employee.mobile_number || '',
      home_telephone: employee.home_telephone || '',
      address_line_1: employee.address_line_1 || '',
      address_line_2: employee.address_line_2 || '',
      city_town: employee.city_town || '',
      postcode: employee.postcode || '',
      country: employee.country || '',
    });
    setErrors({});
    setIsEditing(false);
  };

  return (
    <div>
      {message.text && (
        <div style={{
          padding: '12px 16px',
          marginBottom: '20px',
          borderRadius: '4px',
          backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da',
          color: message.type === 'success' ? '#155724' : '#721c24',
          border: `1px solid ${message.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`
        }}>
          {message.text}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3>Personal Information</h3>
        {canEdit && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="button button-primary"
            style={{ padding: '8px 16px', fontSize: '0.9em' }}
          >
            Edit
          </button>
        )}
      </div>

      <div className="card">
        <PersonalInformation
          data={formData}
          onChange={handleFieldChange}
          errors={errors}
          isEditing={isEditing}
        />
        <ContactDetails
          data={formData}
          onChange={handleFieldChange}
          errors={errors}
          isEditing={isEditing}
        />
        <AddressDetails
          data={formData}
          onChange={handleFieldChange}
          errors={errors}
          isEditing={isEditing}
        />

        {isEditing && (
          <div style={{
            display: 'flex',
            gap: '10px',
            marginTop: '30px',
            paddingTop: '20px',
            borderTop: '1px solid var(--border-color)'
          }}>
            <button
              onClick={handleSave}
              disabled={loading}
              className="button button-success"
              style={{ padding: '10px 20px', opacity: loading ? 0.6 : 1 }}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              onClick={handleCancel}
              disabled={loading}
              className="button"
              style={{ padding: '10px 20px', backgroundColor: 'var(--bg-light)', color: 'var(--text)' }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {!canEdit && (
        <div style={{
          padding: '12px 16px',
          marginTop: '20px',
          borderRadius: '4px',
          backgroundColor: '#e9ecef',
          color: '#6c757d',
          fontSize: '0.9em'
        }}>
          Only admins and the employee can edit personal details.
        </div>
      )}
    </div>
  );
}

export default PersonalTab;

