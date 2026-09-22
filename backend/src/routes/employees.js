import express from 'express';
import { protect, adminOnly } from '../middleware/auth.js';
import { uploadSingle } from '../middleware/upload.js';
import { uploadLimiter } from '../middleware/rateLimit.js';
import {
  getEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  updatePersonalInfo,
  deleteEmployee,
} from '../controllers/employeeController.js';
import {
  getEmploymentData,
  updateEmploymentData,
} from '../controllers/employmentController.js';
import {
  getSensitiveInformation,
  updateSensitiveInformation,
} from '../controllers/sensitiveInformationController.js';
import {
  getEmergencyContacts,
  createEmergencyContact,
  updateEmergencyContact,
  deleteEmergencyContact,
} from '../controllers/emergencyContactController.js';
import {
  clockIn,
  clockOut,
  getAttendanceHistory,
  requestCorrection,
  getCurrentClockInStatus,
  addRetrospectiveAttendance,
} from '../controllers/attendanceController.js';
import {
  getAbsenceSummary,
  getAbsenceHistory,
  requestAnnualLeave,
  addAbsence,
  approveAbsence,
  rejectAbsence,
  deleteAbsence,
} from '../controllers/absenceController.js';
import {
  getSponsorshipData,
  toggleSponsoredWorker,
  updateCoS,
  updateImmigration,
  addRtwCheck,
  updateRtwCheck,
  deleteRtwCheck,
  getComplianceAlerts,
} from '../controllers/sponsorshipController.js';
import {
  uploadDocument,
  getEmployeeDocuments,
  getDocument,
  generateDownloadToken,
  downloadDocument,
  updateDocument,
  replaceDocument,
  deleteDocument,
  getAllDocuments,
  getExpiringDocuments,
} from '../controllers/documentsController.js';

const router = express.Router();

// A /test/rowid-check diagnostic route was removed here: it exposed raw
// employee rows to any authenticated user and returned raw database error
// text, neither of which belongs in a deployed build.

// All authenticated users can view employees
router.get('/', protect, getEmployees);
router.get('/:id', protect, getEmployee);

// Only admins can create/update/delete
router.post('/', protect, adminOnly, createEmployee);
router.put('/:id', protect, adminOnly, updateEmployee);
router.delete('/:id', protect, adminOnly, deleteEmployee);

// Employees can update their own personal info, admins can update any
router.put('/:id/personal', protect, updatePersonalInfo);

// Employment data endpoints
router.get('/:id/employment', protect, getEmploymentData);
router.put('/:id/employment', protect, adminOnly, updateEmploymentData);

// Sensitive information endpoints (admin only)
router.get('/:id/sensitive', protect, getSensitiveInformation);
router.put('/:id/sensitive', protect, adminOnly, updateSensitiveInformation);

// Emergency contacts endpoints
router.get('/:id/emergency-contacts', protect, getEmergencyContacts);
router.post('/:id/emergency-contacts', protect, createEmergencyContact);
router.put('/:id/emergency-contacts/:contactId', protect, updateEmergencyContact);
router.delete('/:id/emergency-contacts/:contactId', protect, deleteEmergencyContact);

// Attendance endpoints
router.get('/:id/attendance/status', protect, getCurrentClockInStatus);
router.post('/:id/attendance/clock-in', protect, clockIn);
router.put('/:id/attendance/:recordId/clock-out', protect, clockOut);
router.get('/:id/attendance', protect, getAttendanceHistory);
router.post('/:id/attendance/:recordId/correction', protect, requestCorrection);
router.post('/:id/attendance/retrospective', protect, adminOnly, addRetrospectiveAttendance);

// Absence endpoints
router.get('/:id/absence/summary', protect, getAbsenceSummary);
router.get('/:id/absence/history', protect, getAbsenceHistory);
router.post('/:id/absence/request', protect, requestAnnualLeave);
router.post('/:id/absence/add', protect, adminOnly, addAbsence);
router.patch('/:id/absence/:absenceId/approve', protect, adminOnly, approveAbsence);
router.patch('/:id/absence/:absenceId/reject', protect, adminOnly, rejectAbsence);
router.delete('/:id/absence/:absenceId', protect, adminOnly, deleteAbsence);
// Moved to routes/admin.js — this router mounts at /api/employees, so the
// path above resolved to /api/employees/api/admin/absence/pending.

// Sponsorship endpoints (admin only)
router.get('/:id/sponsorship', protect, getSponsorshipData);
router.patch('/:id/sponsorship/toggle', protect, adminOnly, toggleSponsoredWorker);
router.patch('/:id/sponsorship/cos', protect, adminOnly, updateCoS);
router.patch('/:id/sponsorship/immigration', protect, adminOnly, updateImmigration);
router.post('/:id/sponsorship/rtw-checks', protect, adminOnly, addRtwCheck);
router.patch('/:id/sponsorship/rtw-checks/:checkId', protect, adminOnly, updateRtwCheck);
router.delete('/:id/sponsorship/rtw-checks/:checkId', protect, adminOnly, deleteRtwCheck);
router.get('/:id/sponsorship/alerts', protect, adminOnly, getComplianceAlerts);

// Document endpoints
router.post('/:id/documents', protect, adminOnly, uploadLimiter, uploadSingle('file'), uploadDocument);
router.get('/:id/documents', protect, getEmployeeDocuments);
router.get('/document/:documentId', protect, getDocument);
router.post('/document/:documentId/download-token', protect, generateDownloadToken);
router.get('/document/:documentId/download', protect, downloadDocument);
// PUT and PATCH both map to the same handler: the edit form sends a full
// metadata payload, while existing callers already use PATCH.
router.patch('/document/:documentId', protect, adminOnly, updateDocument);
router.put('/document/:documentId', protect, adminOnly, updateDocument);
router.post('/document/:documentId/replace', protect, adminOnly, uploadLimiter, uploadSingle('file'), replaceDocument);
router.delete('/document/:documentId', protect, adminOnly, deleteDocument);

// Global document endpoints
router.get('/documents/all/list', protect, adminOnly, getAllDocuments);
router.get('/documents/expiring-soon/list', protect, adminOnly, getExpiringDocuments);

export default router;
