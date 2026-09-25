import { query } from '../config/database.js';

function getCurrentTimeISO() {
  return new Date().toISOString();
}

function getTodayDate() {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

/*
 * Every day carries a fixed unpaid break from 13:00 to 14:00. It is deducted
 * only when the shift spans the whole window: a shift starting after 14:00 or
 * ending before 13:00 never overlapped it and is left alone.
 */
const BREAK_START_HOUR = 13;
const BREAK_END_HOUR = 14;
const BREAK_HOURS = 1;

const londonTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/London',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/*
 * Clock times are stored as UTC instants but the break is a wall-clock rule, so
 * the comparison has to be made in London time. Reading the hour off the raw
 * Date would place the break an hour early through British Summer Time.
 */
function londonMinutesSinceMidnight(iso) {
  const [hour, minute] = londonTimeFormatter.format(new Date(iso)).split(':').map(Number);
  return (hour % 24) * 60 + minute;
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

function calculateHours(clockInTime, clockOutTime) {
  if (!clockInTime || !clockOutTime) return null;
  return round2((new Date(clockOutTime) - new Date(clockInTime)) / (1000 * 60 * 60));
}

function calculateBreakHours(clockInTime, clockOutTime) {
  if (!clockInTime || !clockOutTime) return 0;
  const start = londonMinutesSinceMidnight(clockInTime);
  const end = londonMinutesSinceMidnight(clockOutTime);
  const spansBreak = start < BREAK_START_HOUR * 60 && end > BREAK_END_HOUR * 60;
  return spansBreak ? BREAK_HOURS : 0;
}

function calculateNetHours(clockInTime, clockOutTime) {
  const gross = calculateHours(clockInTime, clockOutTime);
  if (gross === null) return null;
  return round2(gross - calculateBreakHours(clockInTime, clockOutTime));
}

/*
 * Gross, break and net are derived on read rather than stored, so records
 * written before the break rule existed report it on the same terms as new ones.
 */
function withHours(record) {
  if (!record) return record;
  const gross = calculateHours(record.clock_in_time, record.clock_out_time);
  const breakHours = calculateBreakHours(record.clock_in_time, record.clock_out_time);
  return {
    ...record,
    gross_hours: gross,
    break_hours: breakHours,
    net_hours: gross === null ? null : round2(gross - breakHours),
  };
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
      ...withHours(result.rows[0]),
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
    // Stored hours are net of the unpaid break, since that is what attendance
    // records and payroll are based on.
    const totalHours = calculateNetHours(clockInTime, clockOutTime);

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
      ...withHours(result.rows[0]),
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

    res.json(result.rows.map(withHours));
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

    res.json(result.rows.map(withHours));
  } catch (error) {
    console.error('Error fetching today attendance:', error);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
}

export async function requestCorrection(req, res) {
  const { id, recordId } = req.params;
  const employeeId = parseInt(id);
  const recordRowId = parseInt(recordId);

  // Corrections are an administrative action: employees who need one raise it
  // with an administrator rather than amending their own record.
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can correct attendance' });
  }

  const { requested_clock_in, requested_clock_out, requested_location } = req.body;

  if (!requested_clock_in) {
    return res.status(400).json({ error: 'Clock in time is required' });
  }

  try {
    // Verify the record belongs to this employee
    const recordCheck = await query(
      `SELECT rowid as id, clock_in_time, clock_out_time, location FROM attendance_records WHERE rowid = ? AND employee_id = ?`,
      [recordRowId, employeeId]
    );

    if (recordCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }

    const record = recordCheck.rows[0];

    /*
     * Capture the superseded times before overwriting them. The correction is
     * applied straight to the record, so this row is the only remaining copy of
     * what was originally clocked and is what the admin audit log reads back.
     *
     * `reason` is NOT NULL in the schema but is no longer collected from the
     * employee, so it is stored empty rather than dropping the column.
     */
    const location = requested_location || record.location;

    await query(
      `INSERT INTO attendance_corrections
         (employee_id, attendance_record_id, original_clock_in, original_clock_out,
          original_location, requested_clock_in, requested_clock_out, requested_location,
          reason, status, approved_by, approval_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'applied', ?, CURRENT_TIMESTAMP)`,
      [
        employeeId,
        recordRowId,
        record.clock_in_time,
        record.clock_out_time,
        record.location,
        requested_clock_in,
        requested_clock_out || null,
        location,
        '',
        req.user.id,
      ]
    );

    /*
     * The record keeps its ordinary status. Writing a distinct 'Corrected'
     * status here previously surfaced the change in the attendance table that
     * employees see; corrections are visible only through the admin audit log.
     */
    // Net hours are recomputed from the amended times, so the break deduction
    // follows the correction automatically.
    const totalHours = calculateNetHours(requested_clock_in, requested_clock_out);
    const status = requested_clock_out ? 'complete' : 'incomplete';
    await query(
      `UPDATE attendance_records SET clock_in_time = ?, clock_out_time = ?, location = ?, total_hours = ?, status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE rowid = ?`,
      [requested_clock_in, requested_clock_out || null, location, totalHours, status, recordRowId]
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
      ...withHours(result.rows[0]),
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

/*
 * Admin-only history of corrections applied to one employee's attendance.
 * Employees must not be able to reach this: the attendance table deliberately
 * gives no indication that a record was amended.
 */
export async function getCorrectionAuditLog(req, res) {
  const { id } = req.params;
  const employeeId = parseInt(id);

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can view correction history' });
  }

  try {
    const result = await query(
      `SELECT ac.rowid as id, ac.attendance_record_id, ar.work_date,
              ac.original_clock_in, ac.original_clock_out, ac.original_location,
              ac.requested_clock_in, ac.requested_clock_out, ac.requested_location,
              ac.status, ac.approval_date, ac.created_at,
              u.email as applied_by
       FROM attendance_corrections ac
       LEFT JOIN attendance_records ar ON ar.rowid = ac.attendance_record_id
       LEFT JOIN users u ON u.rowid = ac.approved_by
       WHERE ac.employee_id = ?
       ORDER BY ac.created_at DESC`,
      [employeeId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching correction audit log:', error);
    res.status(500).json({ error: 'Failed to fetch correction history' });
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
    const totalHours = calculateNetHours(clock_in_time, clock_out_time);

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
      ...withHours(result.rows[0]),
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
        record: withHours(result.rows[0])
      });
    }
  } catch (error) {
    console.error('Error checking clock in status:', error);
    res.status(500).json({ error: 'Failed to check status' });
  }
}
