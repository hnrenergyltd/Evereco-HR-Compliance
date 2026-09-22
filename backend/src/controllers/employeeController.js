import bcrypt from 'bcryptjs';
import { query } from '../config/database.js';
import { generateTemporaryPassword } from '../utils/password.js';
import { sendCredentialsEmail } from '../utils/mailer.js';

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '10', 10);

export async function getEmployees(req, res) {
  // Employees can only see their own profile
  if (req.user.role === 'employee') {
    const result = await query(
      `SELECT rowid as id, first_name, surname, job_title, department, employment_status, created_at
       FROM employees
       WHERE rowid = ? AND deleted_at IS NULL`,
      [req.user.employee_id]
    );
    return res.json(result.rows || []);
  }

  // Admins can see all employees
  const result = await query(
    `SELECT rowid as id, first_name, surname, job_title, department, employment_status, created_at
     FROM employees
     WHERE deleted_at IS NULL
     ORDER BY created_at DESC`
  );

  res.json(result.rows || []);
}

export async function getEmployee(req, res) {
  const { id } = req.params;
  const employeeId = parseInt(id);

  // Check authorization - employee can only see their own profile
  if (req.user.role === 'employee' && req.user.employee_id !== employeeId) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  const result = await query(
    `SELECT e.rowid as id, e.first_name, e.surname, e.job_title, e.department, e.employment_status, e.email, e.mobile_number, e.home_address, e.postcode, e.date_of_birth, e.nationality, e.national_insurance_number, e.sponsored_worker, e.created_by, e.created_at, e.updated_by, e.updated_at, e.employment_type, e.employment_start_date, e.employment_end_date, e.contracted_weekly_hours, e.normal_working_days, e.normal_working_hours, e.annual_leave_entitlement, e.probation_period, e.notice_period, e.normal_place_of_work, e.manager_id, e.annual_salary, e.hourly_rate, e.payment_frequency, e.salary_effective_date, pd.title, pd.middle_name, pd.preferred_name, pd.date_of_birth,
            pd.nationality, pd.ni_number, pd.personal_email, pd.work_email,
            pd.mobile_number, pd.home_telephone, pd.address_line_1, pd.address_line_2,
            pd.city_town, pd.postcode, pd.country
     FROM employees e
     LEFT JOIN personal_details pd ON e.rowid = pd.employee_id
     WHERE e.rowid = ? AND e.deleted_at IS NULL`,
    [id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Employee not found' });
  }

  res.json(result.rows[0]);
}

export async function createEmployee(req, res) {
  try {
    const {
      first_name,
      surname,
      job_title,
      department,
      employment_status,
      email,
      send_login_email = false,
    } = req.body;

    // Validate required fields
    if (!first_name || !surname || !email) {
      return res.status(400).json({ error: 'First name, surname, and email are required' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) {
      return res.status(400).json({ error: 'A valid email address is required' });
    }

    // Names are stored and later rendered in the UI, so cap them rather than
    // accepting unbounded input.
    if (String(first_name).length > 100 || String(surname).length > 100) {
      return res.status(400).json({ error: 'Name fields must be 100 characters or fewer' });
    }

    // Check if email already exists
    const existingUser = await query('SELECT rowid as id FROM users WHERE email = ?', [email]);
    const existing = existingUser.rows || existingUser;
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    // Create employee record
    const empResult = await query(
      `INSERT INTO employees (first_name, surname, job_title, department, employment_status, email, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [first_name, surname, job_title, department, employment_status, email, req.user.id]
    );

    const employeeId = empResult.lastID;

    /*
     * This previously stored an unsalted SHA-256 digest while login verifies
     * with bcrypt.compare, so every account created here was unable to sign in
     * at all. It now uses bcrypt, matching the login path.
     */
    const tempPassword = generateTemporaryPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, BCRYPT_ROUNDS);

    // Create user account, flagged so the first sign-in must set a real password.
    await query(
      `INSERT INTO users (email, name, password_hash, role, employee_id, must_change_password, created_at)
       VALUES (?, ?, ?, ?, ?, 1, datetime("now"))`,
      [email, `${first_name} ${surname}`, hashedPassword, 'employee', employeeId]
    );

    let emailed = false;
    if (send_login_email) {
      const outcome = await sendCredentialsEmail({
        to: email,
        name: `${first_name} ${surname}`,
        tempPassword,
      });
      emailed = outcome.delivered;
    }

    /*
     * The temporary password is returned so the admin can pass it on when mail
     * is not configured or delivery failed. It is shown once and never stored
     * in readable form.
     */
    res.status(201).json({
      id: employeeId,
      first_name,
      surname,
      email,
      job_title,
      department,
      employment_status,
      temp_password: tempPassword,
      email_sent: emailed,
      message: emailed
        ? 'Employee created. Login details have been emailed to them.'
        : 'Employee created. Share the temporary password with them directly.',
    });

  } catch (error) {
    console.error('Create employee error:', error);
    res.status(500).json({ error: 'Failed to create employee' });
  }
}

export async function updateEmployee(req, res) {
  const { id } = req.params;
  const updates = req.body;

  const allowedFields = [
    'first_name',
    'surname',
    'job_title',
    'department',
    'employment_status',
    'email',
  ];
  const filteredUpdates = Object.fromEntries(
    Object.entries(updates).filter(([key]) => allowedFields.includes(key))
  );

  const setClause = Object.keys(filteredUpdates)
    .map((key) => `${key} = ?`)
    .join(', ');

  const values = [...Object.values(filteredUpdates), req.user.id, id];

  const result = await query(
    `UPDATE employees SET ${setClause}, updated_at = CURRENT_TIMESTAMP, updated_by = ? WHERE rowid = ? AND deleted_at IS NULL`,
    values
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Employee not found' });
  }

  res.json({ id, ...filteredUpdates });
}

export async function updatePersonalInfo(req, res) {
  const { id } = req.params;
  const employeeId = parseInt(id);

  if (req.user.role === 'employee' && req.user.employee_id !== employeeId) {
    return res.status(403).json({ error: 'Not authorized to edit this employee' });
  }

  const personalDetailsFields = [
    'title',
    'middle_name',
    'preferred_name',
    'date_of_birth',
    'nationality',
    'ni_number',
    'personal_email',
    'work_email',
    'mobile_number',
    'home_telephone',
    'address_line_1',
    'address_line_2',
    'city_town',
    'postcode',
    'country',
  ];

  const employeesFields = ['first_name', 'surname'];

  const personalDetailsUpdates = Object.fromEntries(
    Object.entries(req.body).filter(([key]) => personalDetailsFields.includes(key))
  );

  const employeesUpdates = Object.fromEntries(
    Object.entries(req.body).filter(([key]) => employeesFields.includes(key))
  );

  if (Object.keys(personalDetailsUpdates).length === 0 && Object.keys(employeesUpdates).length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  try {
    // Check if employee exists
    const empResult = await query('SELECT rowid as id FROM employees WHERE rowid = ? AND deleted_at IS NULL', [employeeId]);
    if (empResult.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Update employees table if needed
    if (Object.keys(employeesUpdates).length > 0) {
      const setClause = Object.keys(employeesUpdates)
        .map((key) => `${key} = ?`)
        .join(', ');
      const values = [...Object.values(employeesUpdates), employeeId];

      await query(
        `UPDATE employees SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE rowid = ?`,
        values
      );
    }

    // Check if personal_details record exists
    const pdResult = await query('SELECT rowid as id FROM personal_details WHERE employee_id = ?', [employeeId]);

    if (Object.keys(personalDetailsUpdates).length > 0) {
      if (pdResult.rows.length === 0) {
        // Insert new personal_details record
        const fields = Object.keys(personalDetailsUpdates);
        const placeholders = fields.map(() => '?').join(', ');
        const fieldsList = fields.join(', ');
        const values = [...Object.values(personalDetailsUpdates), employeeId];

        await query(
          `INSERT INTO personal_details (${fieldsList}, employee_id, created_at, updated_at)
           VALUES (${placeholders}, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          values
        );
      } else {
        // Update existing personal_details record
        const setClause = Object.keys(personalDetailsUpdates)
          .map((key) => `${key} = ?`)
          .join(', ');
        const values = [...Object.values(personalDetailsUpdates), employeeId];

        await query(
          `UPDATE personal_details SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE employee_id = ?`,
          values
        );
      }
    }

    // Return updated employee with personal details
    const result = await query(
      `SELECT e.rowid as id, e.first_name, e.surname, e.job_title, e.department, e.employment_status, e.email, e.mobile_number, e.home_address, e.postcode, e.date_of_birth, e.nationality, e.national_insurance_number, e.sponsored_worker, e.created_by, e.created_at, e.updated_by, e.updated_at, e.employment_type, e.employment_start_date, e.employment_end_date, e.contracted_weekly_hours, e.normal_working_days, e.normal_working_hours, e.annual_leave_entitlement, e.probation_period, e.notice_period, e.normal_place_of_work, e.manager_id, e.annual_salary, e.hourly_rate, e.payment_frequency, e.salary_effective_date, pd.title, pd.middle_name, pd.preferred_name, pd.date_of_birth,
              pd.nationality, pd.ni_number, pd.personal_email, pd.work_email,
              pd.mobile_number, pd.home_telephone, pd.address_line_1, pd.address_line_2,
              pd.city_town, pd.postcode, pd.country
       FROM employees e
       LEFT JOIN personal_details pd ON e.rowid = pd.employee_id
       WHERE e.rowid = ?`,
      [employeeId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating personal info:', error);
    res.status(500).json({ error: 'Failed to save personal information' });
  }
}

export async function deleteEmployee(req, res) {
  try {
    const { id } = req.params;
    const employeeId = parseInt(id);

    // Only admins can delete employees
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only administrators can delete employees' });
    }

    // Prevent self-deletion
    if (req.user.employee_id === employeeId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // Check if employee exists
    const empResult = await query('SELECT rowid as id FROM employees WHERE rowid = ? AND deleted_at IS NULL', [employeeId]);
    if (!empResult.rows || empResult.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Soft delete: mark employee as deleted with timestamp
    const deleteResult = await query(
      `UPDATE employees SET deleted_at = datetime('now'), updated_by = ? WHERE rowid = ?`,
      [req.user.id, employeeId]
    );

    // Log the deletion in audit trail
    await query(
      `INSERT INTO audit_history (user_id, action, entity_type, entity_id, new_value, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [req.user.id, 'DELETE', 'employees', employeeId, JSON.stringify({ action: 'Employee deleted' })]
    );

    res.json({
      message: 'Employee deleted successfully',
      id: employeeId,
      deleted_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error deleting employee:', error);
    res.status(500).json({ error: 'Failed to delete employee' });
  }
}
