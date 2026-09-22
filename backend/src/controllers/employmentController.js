import { query } from '../config/database.js';

export async function getEmploymentData(req, res) {
  const { id } = req.params;
  const employeeId = parseInt(id);

  // Check authorization - employee can only see their own data
  if (req.user.role === 'employee' && req.user.employee_id !== employeeId) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  try {
    // Get employee employment info
    const empResult = await query(
      `SELECT rowid as id, first_name, surname, email, job_title, department, employment_type,
              employment_start_date, employment_end_date, contracted_weekly_hours,
              normal_working_days, normal_working_hours, annual_leave_entitlement,
              probation_period, notice_period, normal_place_of_work, job_description,
              employment_status, annual_salary, hourly_rate, payment_frequency,
              salary_effective_date, manager_id
       FROM employees WHERE rowid = ? AND deleted_at IS NULL`,
      [employeeId]
    );

    if (empResult.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Get salary history
    const salaryResult = await query(
      `SELECT id, previous_salary, new_salary, date_changed, changed_by, reason
       FROM salary_history WHERE employee_id = ? ORDER BY date_changed DESC LIMIT 50`,
      [employeeId]
    );

    // Get employment history
    const historyResult = await query(
      `SELECT id, field_changed, previous_value, new_value, date_changed, changed_by
       FROM employment_history WHERE employee_id = ? ORDER BY date_changed DESC LIMIT 50`,
      [employeeId]
    );

    res.json({
      employee: empResult.rows[0],
      salaryHistory: salaryResult.rows,
      employmentHistory: historyResult.rows
    });
  } catch (error) {
    console.error('Error fetching employment data:', error);
    res.status(500).json({ error: 'Failed to fetch employment data' });
  }
}

export async function updateEmploymentData(req, res) {
  const { id } = req.params;
  const employeeId = parseInt(id);

  // Only admins can update employment data
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can update employment information' });
  }

  const {
    employment_type,
    employment_start_date,
    employment_end_date,
    contracted_weekly_hours,
    normal_working_days,
    normal_working_hours,
    annual_leave_entitlement,
    probation_period,
    notice_period,
    normal_place_of_work,
    job_title,
    department,
    job_description,
    employment_status,
    annual_salary,
    hourly_rate,
    payment_frequency,
    salary_effective_date,
    salary_change_reason
  } = req.body;

  // Validation
  if (!employment_type || !employment_start_date || !job_title || !department || !employment_status) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (annual_salary === undefined || annual_salary === null || isNaN(annual_salary) || annual_salary < 0) {
    return res.status(400).json({ error: 'Annual salary must be a positive number' });
  }

  // Date validation
  if (employment_end_date) {
    const startDate = new Date(employment_start_date);
    const endDate = new Date(employment_end_date);
    if (endDate < startDate) {
      return res.status(400).json({ error: 'End date must be after start date' });
    }
  }

  try {
    // Get current employee data for change tracking
    const currentResult = await query(
      `SELECT rowid as id, annual_salary, job_title, contracted_weekly_hours, normal_place_of_work, department, employment_status
       FROM employees WHERE rowid = ? AND deleted_at IS NULL`,
      [employeeId]
    );

    if (currentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const current = currentResult.rows[0];

    // Update employee record
    await query(
      `UPDATE employees SET
        employment_type = ?,
        employment_start_date = ?,
        employment_end_date = ?,
        contracted_weekly_hours = ?,
        normal_working_days = ?,
        normal_working_hours = ?,
        annual_leave_entitlement = ?,
        probation_period = ?,
        notice_period = ?,
        normal_place_of_work = ?,
        job_title = ?,
        department = ?,
        job_description = ?,
        employment_status = ?,
        annual_salary = ?,
        hourly_rate = ?,
        payment_frequency = ?,
        salary_effective_date = ?,
        updated_at = CURRENT_TIMESTAMP,
        updated_by = ?
       WHERE rowid = ? AND deleted_at IS NULL`,
      [
        employment_type,
        employment_start_date,
        employment_end_date || null,
        contracted_weekly_hours || null,
        normal_working_days || null,
        normal_working_hours || null,
        annual_leave_entitlement || 20,
        probation_period || null,
        notice_period || null,
        normal_place_of_work || null,
        job_title,
        department,
        job_description || null,
        employment_status,
        annual_salary,
        hourly_rate || null,
        payment_frequency,
        salary_effective_date || null,
        req.user.id,
        employeeId
      ]
    );

    // Note: History tracking skipped due to SQLite schema issue with NULL id values
    // TODO: Fix when employees table id column is properly mapped to rowid

    // Fetch updated data
    const empResult = await query(
      `SELECT rowid as id, first_name, surname, email, job_title, department, employment_type,
              employment_start_date, employment_end_date, contracted_weekly_hours,
              normal_working_days, normal_working_hours, annual_leave_entitlement,
              probation_period, notice_period, normal_place_of_work, job_description,
              employment_status, annual_salary, hourly_rate, payment_frequency,
              salary_effective_date, manager_id
       FROM employees WHERE rowid = ? AND deleted_at IS NULL`,
      [employeeId]
    );

    const salaryResult = await query(
      `SELECT id, previous_salary, new_salary, date_changed, changed_by, reason
       FROM salary_history WHERE employee_id = ? ORDER BY date_changed DESC LIMIT 50`,
      [employeeId]
    );

    const historyResult = await query(
      `SELECT id, field_changed, previous_value, new_value, date_changed, changed_by
       FROM employment_history WHERE employee_id = ? ORDER BY date_changed DESC LIMIT 50`,
      [employeeId]
    );

    res.json({
      employee: empResult.rows[0],
      salaryHistory: salaryResult.rows,
      employmentHistory: historyResult.rows,
      message: 'Employment information updated successfully'
    });
  } catch (error) {
    console.error('Error updating employment data:', error);
    res.status(500).json({ error: 'Failed to update employment data' });
  }
}
