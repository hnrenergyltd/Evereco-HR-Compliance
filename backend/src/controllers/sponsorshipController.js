import { query } from '../config/database.js';

function calculateDaysRemaining(expiryDate) {
  if (!expiryDate) return null;
  const expiry = new Date(expiryDate);
  const today = new Date();
  const diffTime = expiry - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

export async function getSponsorshipData(req, res) {
  const { id } = req.params;
  const employeeId = parseInt(id);

  // Allow admins to view any employee's data, or employees to view their own
  if (req.user.role !== 'admin' && req.user.employee_id !== employeeId) {
    return res.status(403).json({ error: 'Not authorized to access this sponsorship data' });
  }

  try {
    console.log('🔍 getSponsorshipData called for employee:', employeeId);
    // Get sponsorship record - start with essential columns only
    let sponsorship = null;
    try {
      const sponsorshipResult = await query(
        `SELECT rowid as id, employee_id, cos_reference_number, sponsorship_route,
                soc_occupation_code, job_title_on_cos, salary_on_cos, contracted_hours_on_cos, work_location_on_cos,
                cos_assigned_date, cos_end_date
         FROM sponsorship_records WHERE employee_id = ?`,
        [employeeId]
      );
      sponsorship = sponsorshipResult.rows[0] || null;
      console.log('✅ Base sponsorship record fetched');
    } catch (queryErr) {
      console.error('❌ Base query error:', queryErr.message);
      throw queryErr;
    }

    // Try to load optional fields that might not exist yet
    if (sponsorship) {
      try {
        const optionalResult = await query(
          `SELECT cos_notes, visa_permission_type, visa_start_date, visa_expiry_date,
                  immigration_status, passport_number, passport_country, passport_expiry_date,
                  immigration_notes
           FROM sponsorship_records WHERE employee_id = ?`,
          [employeeId]
        );
        if (optionalResult.rows[0]) {
          sponsorship = { ...sponsorship, ...optionalResult.rows[0] };
          console.log('✅ Optional fields loaded');
        }
      } catch (optErr) {
        console.log('⚠️  Some optional fields not available yet');
      }
    }

    // Auto-create sponsorship record if doesn't exist
    if (!sponsorship) {
      await query(
        `INSERT INTO sponsorship_records (employee_id) VALUES (?)`,
        [employeeId]
      );
      const newResult = await query(
        `SELECT rowid as id, employee_id, cos_reference_number, sponsorship_route,
                soc_occupation_code, job_title_on_cos, salary_on_cos, contracted_hours_on_cos, work_location_on_cos,
                cos_assigned_date, cos_end_date
         FROM sponsorship_records WHERE employee_id = ?`,
        [employeeId]
      );
      sponsorship = newResult.rows[0];
      console.log('✅ Sponsorship record auto-created');
    }

    // Get employee's sponsored_worker status (source of truth from employees table)
    if (sponsorship) {
      const empResult = await query(
        `SELECT sponsored_worker FROM employees WHERE rowid = ?`,
        [employeeId]
      );
      if (empResult.rows[0]) {
        sponsorship.sponsored_worker = empResult.rows[0].sponsored_worker;
      }
    }

    // Get Right to Work checks - be flexible with columns
    let rtwChecks = [];
    try {
      const rtwResult = await query(
        `SELECT rowid as id, employee_id, check_date, check_type, checked_by, outcome,
                follow_up_required, follow_up_due_date
         FROM right_to_work_checks WHERE employee_id = ? AND is_deleted = 0 ORDER BY check_date DESC`,
        [employeeId]
      );
      rtwChecks = rtwResult.rows;
    } catch (rtwErr) {
      console.log('⚠️  Could not fetch RTW checks:', rtwErr.message);
    }

    // Get compliance alerts
    let alerts = [];
    try {
      const alertsResult = await query(
        `SELECT rowid as id, alert_type, severity, message, triggered_date, resolved
         FROM compliance_alerts WHERE employee_id = ? AND resolved = 0 ORDER BY severity DESC`,
        [employeeId]
      );
      alerts = alertsResult.rows;
    } catch (alertErr) {
      console.log('⚠️  Could not fetch alerts:', alertErr.message);
    }

    res.json({
      sponsorship,
      rtwChecks,
      alerts
    });
  } catch (error) {
    console.error('Error fetching sponsorship data:', error);
    res.status(500).json({ error: 'Failed to fetch sponsorship data' });
  }
}

export async function toggleSponsoredWorker(req, res) {
  const { id } = req.params;
  const employeeId = parseInt(id);
  const { sponsored_worker } = req.body;

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can toggle sponsored worker status' });
  }

  try {
    // Update employees table
    await query(
      `UPDATE employees SET sponsored_worker = ?, updated_at = CURRENT_TIMESTAMP WHERE rowid = ?`,
      [sponsored_worker ? 1 : 0, employeeId]
    );

    // Create audit trail
    try {
      await query(
        `INSERT INTO audit_history (user_id, action, created_at)
         VALUES (?, ?, CURRENT_TIMESTAMP)`,
        [req.user.id, `Sponsored Worker Status Changed to ${sponsored_worker ? 'Yes' : 'No'}`]
      );
    } catch (auditErr) {
      console.log('⚠️  Audit trail error:', auditErr.message);
    }

    res.json({ message: 'Sponsored worker status updated' });
  } catch (error) {
    console.error('Error toggling sponsored worker:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
}

export async function updateCoS(req, res) {
  const { id } = req.params;
  const employeeId = parseInt(id);

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can update CoS' });
  }

  const { cos_reference_number, sponsorship_route, soc_occupation_code, job_title_on_cos, salary_on_cos,
          contracted_hours_on_cos, work_location_on_cos, cos_assigned_date, cos_end_date, cos_notes } = req.body;

  try {
    await query(
      `UPDATE sponsorship_records SET cos_reference_number = ?, sponsorship_route = ?,
              soc_occupation_code = ?, job_title_on_cos = ?, salary_on_cos = ?, contracted_hours_on_cos = ?,
              work_location_on_cos = ?, cos_assigned_date = ?, cos_end_date = ?, cos_notes = ?,
              updated_at = CURRENT_TIMESTAMP WHERE employee_id = ?`,
      [cos_reference_number, sponsorship_route, soc_occupation_code, job_title_on_cos, salary_on_cos,
       contracted_hours_on_cos, work_location_on_cos, cos_assigned_date, cos_end_date, cos_notes, employeeId]
    );

    // Create audit trail
    try {
      await query(
        `INSERT INTO audit_history (user_id, action, created_at)
         VALUES (?, ?, CURRENT_TIMESTAMP)`,
        [req.user.id, 'Certificate of Sponsorship Updated']
      );
    } catch (auditErr) {
      console.log('⚠️  Audit trail error:', auditErr.message);
    }

    res.json({ message: 'Certificate of Sponsorship updated' });
  } catch (error) {
    console.error('Error updating CoS:', error);
    res.status(500).json({ error: 'Failed to update CoS' });
  }
}

export async function updateImmigration(req, res) {
  const { id } = req.params;
  const employeeId = parseInt(id);

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can update immigration data' });
  }

  const { visa_permission_type, visa_start_date, visa_expiry_date, immigration_status,
          passport_number, passport_country, passport_expiry_date, immigration_notes } = req.body;

  try {
    await query(
      `UPDATE sponsorship_records SET visa_permission_type = ?, visa_start_date = ?,
              visa_expiry_date = ?, immigration_status = ?, passport_number = ?,
              passport_country = ?, passport_expiry_date = ?, immigration_notes = ?,
              updated_at = CURRENT_TIMESTAMP WHERE employee_id = ?`,
      [visa_permission_type, visa_start_date, visa_expiry_date, immigration_status,
       passport_number, passport_country, passport_expiry_date, immigration_notes, employeeId]
    );

    // Create audit trail
    try {
      await query(
        `INSERT INTO audit_history (user_id, action, created_at)
         VALUES (?, ?, CURRENT_TIMESTAMP)`,
        [req.user.id, 'Immigration Information Updated']
      );
    } catch (auditErr) {
      console.log('⚠️  Audit trail error:', auditErr.message);
    }

    res.json({ message: 'Immigration information updated' });
  } catch (error) {
    console.error('Error updating immigration:', error);
    res.status(500).json({ error: 'Failed to update immigration data' });
  }
}

export async function addRtwCheck(req, res) {
  const { id } = req.params;
  const employeeId = parseInt(id);

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can add RTW checks' });
  }

  const { check_date, check_type, checked_by, outcome, immigration_permission_expiry,
          follow_up_required, follow_up_due_date, notes } = req.body;

  if (!check_date || !check_type || !checked_by || !outcome) {
    return res.status(400).json({ error: 'All required fields must be filled' });
  }

  if (follow_up_required && !follow_up_due_date) {
    return res.status(400).json({ error: 'Follow-up due date required when follow-up is required' });
  }

  try {
    await query(
      `INSERT INTO right_to_work_checks (employee_id, check_date, check_type, checked_by, outcome,
              immigration_permission_expiry, follow_up_required, follow_up_due_date, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [employeeId, check_date, check_type, checked_by, outcome, immigration_permission_expiry || null,
       follow_up_required ? 1 : 0, follow_up_due_date || null, notes || null]
    );

    // Create audit trail
    try {
      await query(
        `INSERT INTO audit_history (user_id, action, created_at)
         VALUES (?, ?, CURRENT_TIMESTAMP)`,
        [req.user.id, 'Right to Work Check Added']
      );
    } catch (auditErr) {
      console.log('⚠️  Audit trail error:', auditErr.message);
    }

    res.json({ message: 'Right to Work check added' });
  } catch (error) {
    console.error('Error adding RTW check:', error);
    res.status(500).json({ error: 'Failed to add check' });
  }
}

export async function updateRtwCheck(req, res) {
  const { id, checkId } = req.params;
  const employeeId = parseInt(id);
  const rtwCheckId = parseInt(checkId);

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can update RTW checks' });
  }

  const { check_date, check_type, checked_by, outcome, immigration_permission_expiry,
          follow_up_required, follow_up_due_date, notes } = req.body;

  try {
    await query(
      `UPDATE right_to_work_checks SET check_date = ?, check_type = ?, checked_by = ?, outcome = ?,
              immigration_permission_expiry = ?, follow_up_required = ?, follow_up_due_date = ?, notes = ?,
              updated_at = CURRENT_TIMESTAMP WHERE rowid = ? AND employee_id = ?`,
      [check_date, check_type, checked_by, outcome, immigration_permission_expiry || null,
       follow_up_required ? 1 : 0, follow_up_due_date || null, notes || null, rtwCheckId, employeeId]
    );

    // Create audit trail
    try {
      await query(
        `INSERT INTO audit_history (user_id, action, created_at)
         VALUES (?, ?, CURRENT_TIMESTAMP)`,
        [req.user.id, 'Right to Work Check Updated']
      );
    } catch (auditErr) {
      console.log('⚠️  Audit trail error:', auditErr.message);
    }

    res.json({ message: 'Right to Work check updated' });
  } catch (error) {
    console.error('Error updating RTW check:', error);
    res.status(500).json({ error: 'Failed to update check' });
  }
}

export async function deleteRtwCheck(req, res) {
  const { id, checkId } = req.params;
  const employeeId = parseInt(id);
  const rtwCheckId = parseInt(checkId);

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can delete RTW checks' });
  }

  try {
    await query(
      `UPDATE right_to_work_checks SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP, deleted_by = ?
       WHERE rowid = ? AND employee_id = ?`,
      [req.user.id, rtwCheckId, employeeId]
    );

    // Create audit trail
    try {
      await query(
        `INSERT INTO audit_history (user_id, action, created_at)
         VALUES (?, ?, CURRENT_TIMESTAMP)`,
        [req.user.id, 'Right to Work Check Deleted']
      );
    } catch (auditErr) {
      console.log('⚠️  Audit trail error:', auditErr.message);
    }

    res.json({ message: 'Right to Work check deleted' });
  } catch (error) {
    console.error('Error deleting RTW check:', error);
    res.status(500).json({ error: 'Failed to delete check' });
  }
}

export async function getComplianceAlerts(req, res) {
  const { id } = req.params;
  const employeeId = parseInt(id);

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can view compliance alerts' });
  }

  try {
    const result = await query(
      `SELECT rowid as id, alert_type, severity, message, triggered_date, resolved
       FROM compliance_alerts WHERE employee_id = ? AND resolved = 0 ORDER BY severity DESC`,
      [employeeId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
}
