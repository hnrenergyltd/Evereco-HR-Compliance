import express from 'express';
import { protect, adminOnly } from '../middleware/auth.js';
import {
  getTodayAttendance,
  getPendingCorrections,
  approveCorrection,
  rejectCorrection,
} from '../controllers/attendanceController.js';
import { getPendingAbsences } from '../controllers/absenceController.js';

const router = express.Router();

// Attendance admin endpoints
router.get('/attendance/today', protect, adminOnly, getTodayAttendance);
router.get('/attendance/corrections', protect, adminOnly, getPendingCorrections);
router.put('/attendance/corrections/:correctionId/approve', protect, adminOnly, approveCorrection);
router.put('/attendance/corrections/:correctionId/reject', protect, adminOnly, rejectCorrection);

// Absence admin endpoints
router.get('/absence/pending', protect, adminOnly, getPendingAbsences);

export default router;
