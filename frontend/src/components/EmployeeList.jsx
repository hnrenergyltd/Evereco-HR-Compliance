import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import AddEmployeeModal from './AddEmployeeModal';
import './EmployeeList.css';

function EmployeeList() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setCurrentUser(user);

    // If user is an employee, redirect to their own profile
    if (user?.role === 'employee' && user?.employee_id) {
      navigate(`/employees/${user.employee_id}`);
      return;
    }

    const fetchEmployees = async () => {
      try {
        const response = await api.get('/employees');
        setEmployees(response.data);
      } catch (err) {
        setError('Failed to fetch employees');
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, [navigate]);

  /*
   * The modal stays mounted when it asks to (keepOpen): it is showing the
   * one-time temporary password, and closing it here would take that away
   * before the admin had a chance to copy it. The modal closes itself.
   */
  const handleEmployeeAdded = (newEmployee, { keepOpen = false } = {}) => {
    setEmployees((prev) => [newEmployee, ...prev]);
    if (!keepOpen) setShowAddModal(false);
  };

  if (loading) return <div className="container">Loading...</div>;
  if (error) return <div className="container alert alert-error">{error}</div>;

  return (
    <div className="container">
      <div className="employees-header">
        <h1>Employees</h1>
        {currentUser?.role === 'admin' && (
          <button
            className="btn btn-primary btn-add-employee"
            onClick={() => setShowAddModal(true)}
          >
            + Add New Employee
          </button>
        )}
      </div>

      {/* Desktop Table Layout */}
      <div className="employees-table-wrapper">
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Job Title</th>
                <th>Department</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.id}>
                  <td>
                    {emp.first_name} {emp.surname}
                  </td>
                  <td>{emp.job_title || '-'}</td>
                  <td>{emp.department || '-'}</td>
                  <td>
                    <span className={`status-badge status-${emp.employment_status}`}>
                      {emp.employment_status}
                    </span>
                  </td>
                  <td>
                    <Link to={`/employees/${emp.id}`} className="btn btn-primary btn-view-desktop">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card Layout */}
      <div className="employees-cards-wrapper">
        {employees.map((emp) => (
          <Link key={emp.id} to={`/employees/${emp.id}`} className="employee-card-link">
            <div className="employee-card">
              <div className="employee-card-header">
                <h3 className="employee-name">
                  {emp.first_name} {emp.surname}
                </h3>
                <span className={`status-badge status-${emp.employment_status}`}>
                  {emp.employment_status}
                </span>
              </div>
              <div className="employee-card-body">
                {emp.job_title && (
                  <div className="employee-info">
                    <span className="info-label">Job Title</span>
                    <span className="info-value">{emp.job_title}</span>
                  </div>
                )}
                {emp.department && (
                  <div className="employee-info">
                    <span className="info-label">Department</span>
                    <span className="info-value">{emp.department}</span>
                  </div>
                )}
              </div>
              <div className="employee-card-footer">
                <span className="view-profile">View Profile →</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {showAddModal && (
        <AddEmployeeModal
          onClose={() => setShowAddModal(false)}
          onEmployeeAdded={handleEmployeeAdded}
        />
      )}
    </div>
  );
}

export default EmployeeList;
