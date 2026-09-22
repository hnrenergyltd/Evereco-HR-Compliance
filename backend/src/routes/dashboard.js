import express from 'express';
import { query } from '../config/database.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, async (req, res) => {
  try {
    const employeeCount = await query(
      'SELECT COUNT(*) as count FROM employees WHERE deleted_at IS NULL'
    );

    const attendanceToday = await query(
      `SELECT COUNT(DISTINCT employee_id) as count FROM attendance_records
       WHERE DATE(clock_in_time) = CURRENT_DATE AND clock_in_time IS NOT NULL`
    );

    const absenceToday = await query(
      `SELECT COUNT(*) as count FROM absence_records
       WHERE start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE AND authorised = true`
    );

    res.json({
      totalEmployees: parseInt(employeeCount.rows[0].count),
      workingToday: parseInt(attendanceToday.rows[0].count),
      absentToday: parseInt(absenceToday.rows[0].count),
      sponsoredWorkers: 0,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

export default router;
