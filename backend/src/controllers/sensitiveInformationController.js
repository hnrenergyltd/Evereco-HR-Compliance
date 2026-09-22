import { query } from '../config/database.js';

export async function getSensitiveInformation(req, res) {
  const { id } = req.params;
  const employeeId = parseInt(id);

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can access sensitive information' });
  }

  try {
    const result = await query(
      `SELECT rowid as id, employee_id, tax_code, ni_number, passport_number,
              passport_country_of_issue, passport_expiry_date, driving_licence_number,
              driving_licence_country_of_issue, driving_licence_class, driving_licence_expiry_date,
              dbs_initial_check_conducted, dbs_check_conducted, dbs_certificate_number,
              right_to_work_status, leaving_date, reason_for_termination,
              created_at, updated_at
       FROM sensitive_information WHERE employee_id = ?`,
      [employeeId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No sensitive information found for this employee' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching sensitive information:', error);
    res.status(500).json({ error: 'Failed to fetch sensitive information' });
  }
}

export async function updateSensitiveInformation(req, res) {
  const { id } = req.params;
  const employeeId = parseInt(id);

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can update sensitive information' });
  }

  const {
    tax_code,
    ni_number,
    passport_number,
    passport_country_of_issue,
    passport_expiry_date,
    driving_licence_number,
    driving_licence_country_of_issue,
    driving_licence_class,
    driving_licence_expiry_date,
    dbs_initial_check_conducted,
    dbs_check_conducted,
    dbs_certificate_number,
    right_to_work_status,
    leaving_date,
    reason_for_termination
  } = req.body;

  try {
    // Check if employee exists
    const empCheck = await query(
      `SELECT rowid as id FROM employees WHERE rowid = ? AND deleted_at IS NULL`,
      [employeeId]
    );

    if (empCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Validate DBS certificate format if provided
    if (dbs_certificate_number && !/^\d{12}$/.test(dbs_certificate_number)) {
      return res.status(400).json({ error: 'DBS certificate must be 12 digits' });
    }

    // Validate NI number format if provided (XX 99 99 99 X or AB 12 34 56 C style)
    if (ni_number && !/^[A-Z]{2}\s\d{2}\s\d{2}\s\d{2}\s[A-Z]$/.test(ni_number.toUpperCase())) {
      return res.status(400).json({ error: 'NI number must be in format: AB 12 34 56 C' });
    }

    // Check if record exists
    const existingResult = await query(
      `SELECT rowid as id FROM sensitive_information WHERE employee_id = ?`,
      [employeeId]
    );

    if (existingResult.rows.length === 0) {
      // Insert new record
      await query(
        `INSERT INTO sensitive_information (
          employee_id, tax_code, ni_number, passport_number, passport_country_of_issue,
          passport_expiry_date, driving_licence_number, driving_licence_country_of_issue,
          driving_licence_class, driving_licence_expiry_date, dbs_initial_check_conducted,
          dbs_check_conducted, dbs_certificate_number, right_to_work_status, leaving_date,
          reason_for_termination, created_by, updated_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          employeeId, tax_code || null, ni_number || null, passport_number || null,
          passport_country_of_issue || null, passport_expiry_date || null,
          driving_licence_number || null, driving_licence_country_of_issue || null,
          driving_licence_class || null, driving_licence_expiry_date || null,
          dbs_initial_check_conducted ? 1 : 0, dbs_check_conducted ? 1 : 0,
          dbs_certificate_number || null, right_to_work_status || null,
          leaving_date || null, reason_for_termination || null,
          req.user.id, req.user.id
        ]
      );
    } else {
      // Update existing record
      await query(
        `UPDATE sensitive_information SET
          tax_code = ?, ni_number = ?, passport_number = ?,
          passport_country_of_issue = ?, passport_expiry_date = ?,
          driving_licence_number = ?, driving_licence_country_of_issue = ?,
          driving_licence_class = ?, driving_licence_expiry_date = ?,
          dbs_initial_check_conducted = ?, dbs_check_conducted = ?, dbs_certificate_number = ?,
          right_to_work_status = ?, leaving_date = ?, reason_for_termination = ?,
          updated_at = CURRENT_TIMESTAMP, updated_by = ?
         WHERE employee_id = ?`,
        [
          tax_code || null, ni_number || null, passport_number || null,
          passport_country_of_issue || null, passport_expiry_date || null,
          driving_licence_number || null, driving_licence_country_of_issue || null,
          driving_licence_class || null, driving_licence_expiry_date || null,
          dbs_initial_check_conducted ? 1 : 0, dbs_check_conducted ? 1 : 0,
          dbs_certificate_number || null, right_to_work_status || null,
          leaving_date || null, reason_for_termination || null,
          req.user.id, employeeId
        ]
      );
    }

    // Fetch and return updated data
    const result = await query(
      `SELECT rowid as id, employee_id, tax_code, ni_number, passport_number,
              passport_country_of_issue, passport_expiry_date, driving_licence_number,
              driving_licence_country_of_issue, driving_licence_class, driving_licence_expiry_date,
              dbs_initial_check_conducted, dbs_check_conducted, dbs_certificate_number,
              right_to_work_status, leaving_date, reason_for_termination,
              created_at, updated_at
       FROM sensitive_information WHERE employee_id = ?`,
      [employeeId]
    );

    res.json({
      ...result.rows[0],
      message: 'Sensitive information updated successfully'
    });
  } catch (error) {
    console.error('Error updating sensitive information:', error);
    res.status(500).json({ error: 'Failed to update sensitive information' });
  }
}
