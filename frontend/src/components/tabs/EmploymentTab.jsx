import { useState, useEffect } from "react";
import "./EmploymentTab.css";

function EmploymentTab({ employee, currentUser, isReadOnly = false }) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [employmentData, setEmploymentData] = useState(null);
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});

  const canEdit = (currentUser?.role === "admin" && !isReadOnly) && !isReadOnly;

  useEffect(() => {
    fetchEmploymentData();
  }, [employee?.id]);

  const fetchEmploymentData = async () => {
    try {
      const response = await fetch(`/api/employees/${employee?.id}/employment`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setEmploymentData(data.employee);
        
        setFormData({
          employment_type: data.employee.employment_type || "",
          employment_start_date: data.employee.employment_start_date || "",
          employment_end_date: data.employee.employment_end_date || "",
          contracted_weekly_hours: data.employee.contracted_weekly_hours || "",
          normal_working_days: data.employee.normal_working_days || "",
          normal_working_hours: data.employee.normal_working_hours || "",
          annual_leave_entitlement: data.employee.annual_leave_entitlement || 20,
          probation_period: data.employee.probation_period || "",
          notice_period: data.employee.notice_period || "",
          normal_place_of_work: data.employee.normal_place_of_work || "",
          job_title: data.employee.job_title || "",
          department: data.employee.department || "",
          job_description: data.employee.job_description || "",
          employment_status: data.employee.employment_status || "Active",
          annual_salary: data.employee.annual_salary || "",
          hourly_rate: data.employee.hourly_rate || "",
          payment_frequency: data.employee.payment_frequency || "Monthly",
          salary_effective_date: data.employee.salary_effective_date || "",
          salary_change_reason: ""
        });
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.employment_type) newErrors.employment_type = "Required";
    if (!formData.employment_start_date) newErrors.employment_start_date = "Required";
    if (!formData.job_title) newErrors.job_title = "Required";
    if (!formData.department) newErrors.department = "Required";
    if (!formData.employment_status) newErrors.employment_status = "Required";
    if (!formData.annual_salary || isNaN(formData.annual_salary) || formData.annual_salary < 0) {
      newErrors.annual_salary = "Must be a positive number";
    }
    
    if (formData.employment_end_date && formData.employment_start_date) {
      if (new Date(formData.employment_end_date) < new Date(formData.employment_start_date)) {
        newErrors.employment_end_date = "Must be after start date";
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => { const newErrors = { ...prev }; delete newErrors[field]; return newErrors; });
    }
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/employees/${employee?.id}/employment`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const data = await response.json();
        setEmploymentData(data.employee);
        setMessage({ type: "success", text: "Employment information updated successfully" });
        setIsEditing(false);
        setTimeout(() => setMessage({ type: "", text: "" }), 3000);
      } else {
        const error = await response.json();
        setMessage({ type: "error", text: error.error || "Failed to save" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Error: " + error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    fetchEmploymentData();
    setIsEditing(false);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" });
  };

  const formatCurrency = (value) => {
    if (!value) return "£0.00";
    return "£" + parseFloat(value).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  if (!employmentData) return <div className="card">Loading employment data...</div>;

  return (
    <div className="employment-container">
      {message.text && (
        <div className={`message-toast ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="employment-header">
        <h3>Employment Information</h3>
        {canEdit && !isEditing && (
          <button onClick={() => setIsEditing(true)} className="button button-primary">
            Edit Employment
          </button>
        )}
      </div>

      {/* Contract Information */}
      <div className="employment-card contract-card">
        <h4 className="section-title">Contract Information</h4>
        <div className="form-grid">
          <div className="form-group">
            <label>Employment Type</label>
            {isEditing ? (
              <select value={formData.employment_type} onChange={(e) => handleInputChange("employment_type", e.target.value)} className="form-control">
                <option value="">Select</option>
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
                <option value="Temporary">Temporary</option>
              </select>
            ) : (
              <p className="field-value">{employmentData.employment_type || "-"}</p>
            )}
            {errors.employment_type && <span className="error-text">{errors.employment_type}</span>}
          </div>

          <div className="form-group">
            <label>Employment Start Date</label>
            {isEditing ? (
              <input type="date" value={formData.employment_start_date} onChange={(e) => handleInputChange("employment_start_date", e.target.value)} className="form-control" />
            ) : (
              <p className="field-value">{formatDate(employmentData.employment_start_date)}</p>
            )}
            {errors.employment_start_date && <span className="error-text">{errors.employment_start_date}</span>}
          </div>

          <div className="form-group">
            <label>Employment End Date</label>
            {isEditing ? (
              <input type="date" value={formData.employment_end_date} onChange={(e) => handleInputChange("employment_end_date", e.target.value)} className="form-control" />
            ) : (
              <p className="field-value">{formData.employment_end_date ? formatDate(employmentData.employment_end_date) : "Current"}</p>
            )}
            {errors.employment_end_date && <span className="error-text">{errors.employment_end_date}</span>}
          </div>

          <div className="form-group">
            <label>Contracted Weekly Hours</label>
            {isEditing ? (
              <input type="number" step="0.5" value={formData.contracted_weekly_hours} onChange={(e) => handleInputChange("contracted_weekly_hours", e.target.value)} className="form-control" />
            ) : (
              <p className="field-value">{employmentData.contracted_weekly_hours || "-"} hours</p>
            )}
          </div>

          <div className="form-group">
            <label>Normal Working Days</label>
            {isEditing ? (
              <input type="text" placeholder="e.g., Mon-Fri" value={formData.normal_working_days} onChange={(e) => handleInputChange("normal_working_days", e.target.value)} className="form-control" />
            ) : (
              <p className="field-value">{employmentData.normal_working_days || "-"}</p>
            )}
          </div>

          <div className="form-group">
            <label>Normal Working Hours</label>
            {isEditing ? (
              <input type="text" placeholder="e.g., 09:00-17:30" value={formData.normal_working_hours} onChange={(e) => handleInputChange("normal_working_hours", e.target.value)} className="form-control" />
            ) : (
              <p className="field-value">{employmentData.normal_working_hours || "-"}</p>
            )}
          </div>

          <div className="form-group">
            <label>Annual Leave Entitlement</label>
            {isEditing ? (
              <input type="number" value={formData.annual_leave_entitlement} onChange={(e) => handleInputChange("annual_leave_entitlement", e.target.value)} className="form-control" />
            ) : (
              <p className="field-value">{employmentData.annual_leave_entitlement || 20} days</p>
            )}
          </div>

          <div className="form-group">
            <label>Probation Period</label>
            {isEditing ? (
              <input type="text" placeholder="e.g., 3 months" value={formData.probation_period} onChange={(e) => handleInputChange("probation_period", e.target.value)} className="form-control" />
            ) : (
              <p className="field-value">{employmentData.probation_period || "-"}</p>
            )}
          </div>

          <div className="form-group">
            <label>Notice Period</label>
            {isEditing ? (
              <input type="text" placeholder="e.g., 1 month" value={formData.notice_period} onChange={(e) => handleInputChange("notice_period", e.target.value)} className="form-control" />
            ) : (
              <p className="field-value">{employmentData.notice_period || "-"}</p>
            )}
          </div>

          <div className="form-group">
            <label>Normal Place of Work</label>
            {isEditing ? (
              <input type="text" placeholder="e.g., Head Office" value={formData.normal_place_of_work} onChange={(e) => handleInputChange("normal_place_of_work", e.target.value)} className="form-control" />
            ) : (
              <p className="field-value">{employmentData.normal_place_of_work || "-"}</p>
            )}
          </div>
        </div>
      </div>

      {/* Role Information */}
      <div className="employment-card role-card">
        <h4 className="section-title">Role Information</h4>
        <div className="form-grid">
          <div className="form-group">
            <label>Job Title <span className="required">*</span></label>
            {isEditing ? (
              <input type="text" value={formData.job_title} onChange={(e) => handleInputChange("job_title", e.target.value)} className="form-control" />
            ) : (
              <p className="field-value highlight">{employmentData.job_title || "-"}</p>
            )}
            {errors.job_title && <span className="error-text">{errors.job_title}</span>}
          </div>

          <div className="form-group">
            <label>Department <span className="required">*</span></label>
            {isEditing ? (
              <input type="text" value={formData.department} onChange={(e) => handleInputChange("department", e.target.value)} className="form-control" />
            ) : (
              <p className="field-value highlight">{employmentData.department || "-"}</p>
            )}
            {errors.department && <span className="error-text">{errors.department}</span>}
          </div>

          <div className="form-group">
            <label>Employment Status <span className="required">*</span></label>
            {isEditing ? (
              <select value={formData.employment_status} onChange={(e) => handleInputChange("employment_status", e.target.value)} className="form-control">
                <option value="Active">Active</option>
                <option value="On Leave">On Leave</option>
                <option value="Probation">Probation</option>
                <option value="Terminated">Terminated</option>
              </select>
            ) : (
              <p className="field-value"><span className={`status-badge status-${employmentData.employment_status?.toLowerCase()}`}>{employmentData.employment_status || "-"}</span></p>
            )}
            {errors.employment_status && <span className="error-text">{errors.employment_status}</span>}
          </div>

          <div className="form-group full-width">
            <label>Job Description</label>
            {isEditing ? (
              <textarea value={formData.job_description} onChange={(e) => handleInputChange("job_description", e.target.value)} rows="4" className="form-control" />
            ) : (
              <p className="field-value">{employmentData.job_description || "-"}</p>
            )}
          </div>
        </div>
      </div>

      {/* Salary Information */}
      <div className="employment-card salary-card">
        <h4 className="section-title">Salary Information</h4>
        <div className="form-grid">
          <div className="form-group">
            <label>Annual Salary <span className="required">*</span></label>
            {isEditing ? (
              <input type="number" step="100" value={formData.annual_salary} onChange={(e) => handleInputChange("annual_salary", e.target.value)} className="form-control" />
            ) : (
              <p className="field-value salary-value">{formatCurrency(employmentData.annual_salary)}</p>
            )}
            {errors.annual_salary && <span className="error-text">{errors.annual_salary}</span>}
          </div>

          <div className="form-group">
            <label>Hourly Rate</label>
            {isEditing ? (
              <input type="number" step="0.01" value={formData.hourly_rate} onChange={(e) => handleInputChange("hourly_rate", e.target.value)} className="form-control" />
            ) : (
              <p className="field-value">{employmentData.hourly_rate ? "£" + parseFloat(employmentData.hourly_rate).toFixed(2) : "-"}</p>
            )}
          </div>

          <div className="form-group">
            <label>Payment Frequency</label>
            {isEditing ? (
              <select value={formData.payment_frequency} onChange={(e) => handleInputChange("payment_frequency", e.target.value)} className="form-control">
                <option value="Monthly">Monthly</option>
                <option value="Weekly">Weekly</option>
                <option value="Fortnightly">Fortnightly</option>
              </select>
            ) : (
              <p className="field-value">{employmentData.payment_frequency || "-"}</p>
            )}
          </div>

          <div className="form-group">
            <label>Salary Effective Date</label>
            {isEditing ? (
              <input type="date" value={formData.salary_effective_date} onChange={(e) => handleInputChange("salary_effective_date", e.target.value)} className="form-control" />
            ) : (
              <p className="field-value">{formatDate(employmentData.salary_effective_date)}</p>
            )}
          </div>

          {isEditing && (
            <div className="form-group full-width">
              <label>Reason for Salary Change</label>
              <input type="text" placeholder="e.g., Annual increase, Promotion" value={formData.salary_change_reason} onChange={(e) => handleInputChange("salary_change_reason", e.target.value)} className="form-control" />
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      {isEditing && (
        <div className="button-group">
          <button onClick={handleSave} disabled={loading} className="button button-success">
            {loading ? "Saving..." : "Save Changes"}
          </button>
          <button onClick={handleCancel} disabled={loading} className="button button-cancel">
            Cancel
          </button>
        </div>
      )}

      {!canEdit && (
        <div className="info-box">
          ℹ You can only view this information. Contact an administrator to make changes.
        </div>
      )}
    </div>
  );
}

export default EmploymentTab;

