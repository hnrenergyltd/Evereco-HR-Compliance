import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import EmployeeProfileTabs from './EmployeeProfileTabs';

function EmployeeProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUser] = useState(() => {
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const response = await api.get(`/employees/${id}`);
        setEmployee(response.data);
      } catch (err) {
        setError('Failed to fetch employee');
      } finally {
        setLoading(false);
      }
    };

    fetchEmployee();
  }, [id]);

  const handleDeleteEmployee = async () => {
    setIsDeleting(true);
    try {
      await api.delete(`/employees/${id}`);
      setShowDeleteModal(false);
      // Show success message and redirect
      setTimeout(() => {
        navigate('/employees', {
          state: { message: 'Employee deleted successfully' }
        });
      }, 500);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete employee');
      setShowDeleteModal(false);
      setIsDeleting(false);
    }
  };

  if (loading) return <div className="container">Loading...</div>;
  if (error) return <div className="container alert alert-error">{error}</div>;
  if (!employee) return <div className="container">Employee not found</div>;

  // Determine if this is read-only mode
  // Employee can only see their own profile in read-only mode
  const isReadOnly = currentUser?.role === 'employee' && currentUser?.id !== parseInt(id);
  const isOwnProfile = currentUser?.id === parseInt(id);
  const isEmployeeViewingOwnProfile = currentUser?.role === 'employee' && isOwnProfile;

  return (
    <div className="container">
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <button onClick={() => navigate('/employees')} className="btn btn-secondary">
          ← Back to Employees
        </button>
      </div>

      {isEmployeeViewingOwnProfile && (
        <div className="alert" style={{ marginTop: '20px', background: '#E0F2FE', color: '#0C4A6E', border: '1px solid #0EA5E9' }}>
          📋 <strong>View Only:</strong> You can view your profile information but cannot make changes.
        </div>
      )}

      <div className="card" style={{ marginTop: '20px', marginBottom: '30px' }}>
        <h1 style={{ marginBottom: '10px' }}>
          {employee.first_name} {employee.surname}
        </h1>
        <p style={{ color: 'var(--text-light)', marginTop: '5px', marginBottom: '15px' }}>
          {employee.job_title || 'No job title'}
        </p>

        {/* Profile Header Information */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', paddingTop: '15px', borderTop: '1px solid var(--border)' }}>
          <div>
            <p><strong>Department:</strong></p>
            <p style={{ color: 'var(--text-light)' }}>{employee.department || '-'}</p>
          </div>
          <div>
            <p><strong>Status:</strong></p>
            <p><span className={`status-badge status-${employee.employment_status}`}>{employee.employment_status}</span></p>
          </div>
          <div>
            <p><strong>Sponsored Worker:</strong></p>
            <p style={{ color: 'var(--text-light)' }}>{employee.sponsored_worker ? 'Yes' : 'No'}</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation and Content */}
      <div className="card">
        <EmployeeProfileTabs
          employee={employee}
          currentUser={currentUser}
          isReadOnly={isEmployeeViewingOwnProfile}
          onShowDeleteModal={() => setShowDeleteModal(true)}
          showDeleteModal={showDeleteModal}
          isDeleting={isDeleting}
          onDeleteConfirm={handleDeleteEmployee}
          onDeleteCancel={() => setShowDeleteModal(false)}
        />
      </div>

      {/* Footer */}
      <div style={{ marginTop: '20px', textAlign: 'right', color: 'var(--text-light)', fontSize: '0.85em' }}>
        <p>
          Created: {new Date(employee.created_at).toLocaleDateString()} | Last Updated: {new Date(employee.updated_at).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}

export default EmployeeProfile;
