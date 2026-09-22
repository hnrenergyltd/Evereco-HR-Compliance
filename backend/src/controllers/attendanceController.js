import { query } from '../config/database.js';

function getCurrentTimeISO() {
  return new Date().toISOString();
}

function getTodayDate() {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

function calculateHours(clockInTime, clockOutTime) {
  if (!clockInTime || !clockOutTime) return null;
  const inTime = new Date(clockInTime);
  const outTime = new Date(clockOutTime);
  const diffMs = outTime - inTime;
  const hours = diffMs / (1000 * 60 * 60);
  return Math.round(hours * 100) / 100;
}

export async function clockIn(req, res) {
  const { id } = req.params;
  const employeeId = parseInt(id);

  if (req.user.role === 'employee' && req.user.employee_id !== employeeId) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  const { location, site_name } = req.body;

  if (!location) {
    return res.status(400).json({ error: 'Work location is required' });
  }

  try {
    const today = getTodayDate();
    const clockInTime = getCurrentTimeISO();

    // Check if already clocked in today
    const existingResult = await query(
      `SELECT rowid as id FROM attendance_records WHERE employee_id = ? AND work_date = ? AND clock_out_time IS NULL`,
      [employeeId, today]
    );

    if (existingResult.rows.length > 0) {
      return res.status(400).json({ error: 'Already clocked in today' });
    }

    // Insert clock in record
    await query(
      `INSERT INTO attendance_records (employee_id, work_date, clock_in_time, location, site_name, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [employeeId, today, clockInTime, location, site_name || null, 'incomplete']
    );

    // Get the created record
    const result = await query(
      `SELECT rowid as id, employee_id, work_date, clock_in_time, clock_out_time, location, site_name, total_hours, status
       FROM attendance_records WHERE employee_id = ? AND work_date = ? AND clock_out_time IS NULL
       ORDER BY rowid DESC LIMIT 1`,
      [employeeId, today]
    );

    res.status(201).json({
      ...result.rows[0],
      message: 'Clocked in successfully'
    });
  } catch (error) {
    console.error('Error clocking in:', error);
    res.status(500).json({ error: 'Failed to clock in' });
  }
}

export async function clockOut(req, res) {
  const { id, recordId } = req.params;
  const employeeId = parseInt(id);
  const recordRowId = parseInt(recordId);

  if (req.user.role === 'employee' && req.user.employee_id !== employeeId) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  try {
    const clockOutTime = getCurrentTimeISO();

    // Verify the record belongs to this employee and has no clock out
    const recordCheck = await query(
      `SELECT rowid as id, clock_in_time FROM attendance_records WHERE rowid = ? AND employee_id = ? AND clock_out_time IS NULL`,
      [recordRowId, employeeId]
    );

    if (recordCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }

    const clockInTime = recordCheck.rows[0].clock_in_time;
    const totalHours = calculateHours(clockInTime, clockOutTime);

    // Update with clock out time
    await query(
      `UPDATE attendance_records SET clock_out_time = ?, total_hours = ?, status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE rowid = ?`,
      [clockOutTime, totalHours, 'complete', recordRowId]
    );

    // Get updated record
    const result = await query(
      `SELECT rowid as id, employee_id, work_date, clock_in_time, clock_out_time, location, site_name, total_hours, status
       FROM attendance_records WHERE rowid = ?`,
      [recordRowId]
    );

    res.json({
      ...result.rows[0],
      message: `Clocked out successfully. Total time: ${totalHours} hours`
    });
  } catch (error) {
    console.error('Error clocking out:', error);
    res.status(500).json({ error: 'Failed to clock out' });
  }
}

export async function getAttendanceHistory(req, res) {
  const { id } = req.params;
  const employeeId = parseInt(id);

  if (req.user.role === 'employee' && req.user.employee_id !== employeeId) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  try {
    const result = await query(
      `SELECT rowid as id, employee_id, work_date, clock_in_time, clock_out_time, location, site_name, total_hours, status
       FROM attendance_records WHERE employee_id = ? ORDER BY work_date DESC, clock_in_time DESC`,
      [employeeId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching attendance history:', error);
    res.status(500).json({ error: 'Failed to fetch attendance history' });
  }
}

export async function getTodayAttendance(req, res) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can view this' });
  }

  try {
    const today = getTodayDate();

    const result = await query(
      `SELECT ar.rowid as id, ar.employee_id, e.first_name, e.surname, ar.clock_in_time, ar.clock_out_time, ar.location, ar.site_name, ar.total_hours, ar.status
       FROM attendance_records ar
       JOIN employees e ON ar.employee_id = e.rowid
       WHERE ar.work_date = ?
       ORDER BY ar.clock_in_time DESC`,
      [today]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching today attendance:', error);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
}

export async function requestCorrection(req, res) {
  const { id, recordId } = req.params;
  const employeeId = parseInt(id);
  const recordRowId = parseInt(recordId);

  if (req.user.role === 'employee' && req.user.employee_id !== employeeId) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  const { requested_clock_in, requested_clock_out, reason } = req.body;

  if (!requested_clock_in || !reason) {
    return res.status(400).json({ error: 'Clock in time and reason are required' });
  }

  try {
    // Verify the record belongs to this employee
    const recordCheck = await query(
      `SELECT rowid as id, clock_in_time, clock_out_time FROM attendance_records WHERE rowid = ? AND employee_id = ?`,
      [recordRowId, employeeId]
    );

    if (recordCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }

    const record = recordCheck.rows[0];

    // Update the attendance record directly with the corrected times
    const totalHours = calculateHours(requested_clock_in, requested_clock_out);
    await query(
      `UPDATE attendance_records SET clock_in_time = ?, clock_out_time = ?, total_hours = ?, status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE rowid = ?`,
      [requested_clock_in, requested_clock_out || null, totalHours, 'Corrected', recordRowId]
    );

    // Create audit trail for the correction
    await query(
      `INSERT INTO audit_history (user_id, action, entity_type, entity_id, created_at)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [req.user.id, 'Approve Correction', 'employee', employeeId]
    );

    // Get updated record
    const result = await query(
      `SELECT rowid as id, employee_id, work_date, clock_in_time, clock_out_time, location, site_name, total_hours, status
       FROM attendance_records WHERE rowid = ?`,
      [recordRowId]
    );

    res.json({
      ...result.rows[0],
      message: 'Attendance corrected successfully'
    });
  } catch (error) {
    console.error('Error requesting correction:', error);
    res.status(500).json({ error: 'Failed to request correction' });
  }
}

export async function getPendingCorrections(req, res) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can view this' });
  }

  try {
    const result = await query(
      `SELECT ac.rowid as id, ac.employee_id, e.first_name, e.surname, ac.attendance_record_id,
              ac.original_clock_in, ac.original_clock_out, ac.requested_clock_in, ac.requested_clock_out, ac.reason, ac.status, ac.created_at
       FROM attendance_corrections ac
       JOIN employees e ON ac.employee_id = e.rowid
       WHERE ac.status = 'pending'
       ORDER BY ac.created_at ASC`,
      []
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching corrections:', error);
    res.status(500).json({ error: 'Failed to fetch corrections' });
  }
}

export async function approveCorrection(req, res) {
  const { correctionId } = req.params;
  const correctionRowId = parseInt(correctionId);

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can approve corrections' });
  }

  try {
    // Get the correction
    const correctionResult = await query(
      `SELECT rowid as id, attendance_record_id, requested_clock_in, requested_clock_out FROM attendance_corrections WHERE rowid = ? AND status = 'pending'`,
      [correctionRowId]
    );

    if (correctionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Correction request not found' });
    }

    const correction = correctionResult.rows[0];

    // Update the correction status
    await query(
      `UPDATE attendance_corrections SET status = 'approved', approved_by = ?, approval_date = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE rowid = ?`,
      [req.user.id, correctionRowId]
    );

    // Update the attendance record with corrected times
    const totalHours = calculateHours(correction.requested_clock_in, correction.requested_clock_out);
    await query(
      `UPDATE attendance_records SET clock_in_time = ?, clock_out_time = ?, total_hours = ?, updated_at = CURRENT_TIMESTAMP
       WHERE rowid = ?`,
      [correction.requested_clock_in, correction.requested_clock_out, totalHours, correction.attendance_record_id]
    );

    res.json({ message: 'Correction approved' });
  } catch (error) {
    console.error('Error approving correction:', error);
    res.status(500).json({ error: 'Failed to approve correction' });
  }
}

export async function rejectCorrection(req, res) {
  const { correctionId } = req.params;
  const correctionRowId = parseInt(correctionId);

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can reject corrections' });
  }

  try {
    // Update the correction status
    await query(
      `UPDATE attendance_corrections SET status = 'rejected', approved_by = ?, approval_date = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE rowid = ? AND status = 'pending'`,
      [req.user.id, correctionRowId]
    );

    res.json({ message: 'Correction rejected' });
  } catch (error) {
    console.error('Error rejecting correction:', error);
    res.status(500).json({ error: 'Failed to reject correction' });
  }
}

export async function addRetrospectiveAttendance(req, res) {
  const { id } = req.params;
  const employeeId = parseInt(id);

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can add retrospective attendance' });
  }

  const { work_date, clock_in_time, clock_out_time, location, site_name, notes } = req.body;

  if (!work_date || !clock_in_time || !clock_out_time || !location) {
    return res.status(400).json({ error: 'Date, clock in time, clock out time, and location are required' });
  }

  if (new Date(clock_out_time) <= new Date(clock_in_time)) {
    return res.status(400).json({ error: 'Clock out time must be after clock in time' });
  }

  try {
    const totalHours = calculateHours(clock_in_time, clock_out_time);

    await query(
      `INSERT INTO attendance_records (employee_id, work_date, clock_in_time, clock_out_time, location, site_name, total_hours, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [employeeId, work_date, clock_in_time, clock_out_time, location, site_name || null, totalHours, notes || null, 'Complete']
    );

    const result = await query(
      `SELECT rowid as id, employee_id, work_date, clock_in_time, clock_out_time, location, site_name, total_hours, status
       FROM attendance_records WHERE employee_id = ? AND work_date = ? ORDER BY rowid DESC LIMIT 1`,
      [employeeId, work_date]
    );

    res.status(201).json({
      ...result.rows[0],
      message: `Attendance record added for ${work_date}`
    });
  } catch (error) {
    console.error('Error adding retrospective attendance:', error);
    res.status(500).json({ error: 'Failed to add attendance record' });
  }
}

export async function getCurrentClockInStatus(req, res) {
  const { id } = req.params;
  const employeeId = parseInt(id);

  if (req.user.role === 'employee' && req.user.employee_id !== employeeId) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  try {
    const today = getTodayDate();

    const result = await query(
      `SELECT rowid as id, employee_id, work_date, clock_in_time, clock_out_time, location, site_name, total_hours, status
       FROM attendance_records WHERE employee_id = ? AND work_date = ? AND clock_out_time IS NULL
       ORDER BY rowid DESC LIMIT 1`,
      [employeeId, today]
    );

    if (result.rows.length === 0) {
      res.json({ isClockedIn: false });
    } else {
      res.json({
        isClockedIn: true,
        record: result.rows[0]
      });
    }
  } catch (error) {
    console.error('Error checking clock in status:', error);
    res.status(500).json({ error: 'Failed to check status' });
  }
}
