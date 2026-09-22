import { query } from '../config/database.js';
import { sendAbsenceDecisionEmail } from '../utils/mailer.js';

function getCurrentTimeISO() {
  return new Date().toISOString();
}

function calculateWorkingDays(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let count = 0;

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) count++;
  }

  return count;
}

export async function getAbsenceSummary(req, res) {
  const { id } = req.params;
  const employeeId = parseInt(id);

  if (req.user.role === 'employee' && req.user.employee_id !== employeeId) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  try {
    const currentYear = new Date().getFullYear();

    // Get annual leave entitlements
    const entitlementResult = await query(
      `SELECT rowid as id, entitlement, taken, booked FROM annual_leave_entitlements
       WHERE employee_id = ? AND year = ?`,
      [employeeId, currentYear]
    );

    let annualLeave = {
      entitlement: 0,
      taken: 0,
      booked: 0,
      remaining: 0
    };

    if (entitlementResult.rows.length > 0) {
      const ent = entitlementResult.rows[0];
      annualLeave = {
        entitlement: ent.entitlement || 0,
        taken: ent.taken || 0,
        booked: ent.booked || 0,
        remaining: (ent.entitlement || 0) - (ent.taken || 0) - (ent.booked || 0)
      };
    }

    // Get counts for other absence types
    const sickResult = await query(
      `SELECT COUNT(*) as count, COALESCE(SUM(working_days), 0) as days
       FROM absence_records WHERE employee_id = ? AND absence_type = 'Sickness' AND is_deleted = 0`,
      [employeeId]
    );

    const authorisedResult = await query(
      `SELECT COUNT(*) as count, COALESCE(SUM(working_days), 0) as days
       FROM absence_records WHERE employee_id = ? AND absence_type = 'Authorised Absence' AND is_deleted = 0`,
      [employeeId]
    );

    const unauthorisedResult = await query(
      `SELECT COUNT(*) as count, COALESCE(SUM(working_days), 0) as days
       FROM absence_records WHERE employee_id = ? AND absence_type = 'Unauthorised Absence' AND is_deleted = 0`,
      [employeeId]
    );

    const parentalResult = await query(
      `SELECT COUNT(*) as count, COALESCE(SUM(working_days), 0) as days
       FROM absence_records WHERE employee_id = ? AND absence_type = 'Parental Leave' AND is_deleted = 0`,
      [employeeId]
    );

    const otherResult = await query(
      `SELECT COUNT(*) as count, COALESCE(SUM(working_days), 0) as days
       FROM absence_records WHERE employee_id = ? AND absence_type = 'Other' AND is_deleted = 0`,
      [employeeId]
    );

    // Get pending count for admin
    let pendingCount = 0;
    if (req.user.role === 'admin') {
      const pendingResult = await query(
        `SELECT COUNT(*) as count FROM absence_records WHERE status = 'Pending' AND is_deleted = 0`
      );
      pendingCount = pendingResult.rows[0]?.count || 0;
    }

    res.json({
      annualLeave,
      sickness: {
        logged: sickResult.rows[0]?.count || 0,
        days: sickResult.rows[0]?.days || 0
      },
      authorisedAbsence: {
        logged: authorisedResult.rows[0]?.count || 0,
        days: authorisedResult.rows[0]?.days || 0
      },
      unauthorisedAbsence: {
        logged: unauthorisedResult.rows[0]?.count || 0,
        days: unauthorisedResult.rows[0]?.days || 0
      },
      parentalLeave: {
        logged: parentalResult.rows[0]?.count || 0,
        days: parentalResult.rows[0]?.days || 0
      },
      other: {
        logged: otherResult.rows[0]?.count || 0,
        days: otherResult.rows[0]?.days || 0
      },
      pendingApprovals: pendingCount
    });
  } catch (error) {
    console.error('Error fetching absence summary:', error);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
}

export async function getAbsenceHistory(req, res) {
  const { id } = req.params;
  const employeeId = parseInt(id);
  const { startDate, endDate, absenceType, status } = req.query;

  if (req.user.role === 'employee' && req.user.employee_id !== employeeId) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  try {
    let sql = `SELECT rowid as id, employee_id, absence_type, start_date, end_date, working_days,
                reason, status, requested_by, requested_date, approved_by, approval_date, notes, is_deleted
               FROM absence_records WHERE employee_id = ? AND is_deleted = 0`;
    const params = [employeeId];

    if (absenceType) {
      sql += ` AND absence_type = ?`;
      params.push(absenceType);
    }

    if (status) {
      sql += ` AND status = ?`;
      params.push(status);
    }

    if (startDate) {
      sql += ` AND start_date >= ?`;
      params.push(startDate);
    }

    if (endDate) {
      sql += ` AND end_date <= ?`;
      params.push(endDate);
    }

    sql += ` ORDER BY start_date DESC`;

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching absence history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
}

export async function requestAnnualLeave(req, res) {
  const { id } = req.params;
  const employeeId = parseInt(id);

  if (req.user.role === 'employee' && req.user.employee_id !== employeeId) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  const { startDate, endDate, reason } = req.body;

  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'Start date and end date are required' });
  }

  if (new Date(endDate) <= new Date(startDate)) {
    return res.status(400).json({ error: 'End date must be after start date' });
  }

  try {
    const workingDays = calculateWorkingDays(startDate, endDate);

    await query(
      `INSERT INTO absence_records (employee_id, absence_type, start_date, end_date, working_days, reason, status, requested_by, requested_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [employeeId, 'Annual Leave', startDate, endDate, workingDays, reason || null, 'Pending', req.user.id]
    );

    res.status(201).json({ message: 'Annual leave requested successfully' });
  } catch (error) {
    console.error('Error requesting leave:', error);
    res.status(500).json({ error: 'Failed to request leave' });
  }
}

export async function addAbsence(req, res) {
  const { id } = req.params;
  const employeeId = parseInt(id);

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can add absences' });
  }

  const { absenceType, startDate, endDate, workingDays, reason, status, notes } = req.body;

  if (!absenceType || !startDate || !endDate) {
    return res.status(400).json({ error: 'Absence type, start date, and end date are required' });
  }

  try {
    const calcWorkingDays = workingDays || calculateWorkingDays(startDate, endDate);

    await query(
      `INSERT INTO absence_records (employee_id, absence_type, start_date, end_date, working_days, reason, status, requested_by, requested_date, approved_by, approval_date, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, CURRENT_TIMESTAMP, ?)`,
      [employeeId, absenceType, startDate, endDate, calcWorkingDays, reason || null, status || 'Approved', req.user.id, req.user.id, notes || null]
    );

    res.status(201).json({ message: 'Absence record added successfully' });
  } catch (error) {
    console.error('Error adding absence:', error);
    res.status(500).json({ error: 'Failed to add absence' });
  }
}

export async function approveAbsence(req, res) {
  const { absenceId } = req.params;

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can approve' });
  }

  try {
    // Get absence details before updating
    const absenceResult = await query(
      `SELECT a.employee_id, a.absence_type, a.start_date, a.end_date, e.email, e.first_name, e.surname
       FROM absence_records a
       JOIN employees e ON a.employee_id = e.rowid
       WHERE a.rowid = ?`,
      [parseInt(absenceId)]
    );

    const absence = absenceResult.rows[0];
    if (!absence) {
      return res.status(404).json({ error: 'Absence not found' });
    }

    // Update status
    await query(
      `UPDATE absence_records SET status = ?, approved_by = ?, approval_date = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE rowid = ?`,
      ['Approved', req.user.id, parseInt(absenceId)]
    );

    // Send approval email to employee
    if (absence.email) {
      await sendAbsenceDecisionEmail({
        to: absence.email,
        name: `${absence.first_name} ${absence.surname}`,
        absenceType: absence.absence_type,
        startDate: absence.start_date,
        endDate: absence.end_date,
        decision: 'Approved',
      });
    }

    res.json({ message: 'Absence approved' });
  } catch (error) {
    console.error('Error approving absence:', error);
    res.status(500).json({ error: 'Failed to approve' });
  }
}

export async function rejectAbsence(req, res) {
  const { absenceId } = req.params;
  const { notes } = req.body;

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can reject' });
  }

  try {
    // Get absence details before updating
    const absenceResult = await query(
      `SELECT a.employee_id, a.absence_type, a.start_date, a.end_date, e.email, e.first_name, e.surname
       FROM absence_records a
       JOIN employees e ON a.employee_id = e.rowid
       WHERE a.rowid = ?`,
      [parseInt(absenceId)]
    );

    const absence = absenceResult.rows[0];
    if (!absence) {
      return res.status(404).json({ error: 'Absence not found' });
    }

    // Update status
    await query(
      `UPDATE absence_records SET status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
       WHERE rowid = ?`,
      ['Rejected', notes || null, parseInt(absenceId)]
    );

    // Send rejection email to employee
    if (absence.email) {
      await sendAbsenceDecisionEmail({
        to: absence.email,
        name: `${absence.first_name} ${absence.surname}`,
        absenceType: absence.absence_type,
        startDate: absence.start_date,
        endDate: absence.end_date,
        decision: 'Rejected',
        rejectionReason: notes,
      });
    }

    res.json({ message: 'Absence rejected' });
  } catch (error) {
    console.error('Error rejecting absence:', error);
    res.status(500).json({ error: 'Failed to reject' });
  }
}

export async function deleteAbsence(req, res) {
  const { absenceId } = req.params;

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can delete' });
  }

  try {
    await query(
      `UPDATE absence_records SET is_deleted = 1, updated_at = CURRENT_TIMESTAMP
       WHERE rowid = ?`,
      [parseInt(absenceId)]
    );

    res.json({ message: 'Absence deleted' });
  } catch (error) {
    console.error('Error deleting absence:', error);
    res.status(500).json({ error: 'Failed to delete' });
  }
}

export async function getPendingAbsences(req, res) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can view pending' });
  }

  try {
    const result = await query(
      `SELECT ar.rowid as id, ar.employee_id, e.first_name, e.surname, ar.absence_type, ar.start_date, ar.end_date, ar.working_days, ar.reason, ar.requested_date
       FROM absence_records ar
       JOIN employees e ON ar.employee_id = e.rowid
       WHERE ar.status = 'Pending' AND ar.is_deleted = 0
       ORDER BY ar.requested_date ASC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching pending absences:', error);
    res.status(500).json({ error: 'Failed to fetch pending' });
  }
}
