import express from 'express';
import {
  login,
  getCurrentUser,
  logout,
  changePassword,
  forgotPassword,
  resetPassword,
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import {
  loginLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter,
} from '../middleware/rateLimit.js';

const router = express.Router();

router.post('/login', loginLimiter, login);
router.get('/me', protect, getCurrentUser);
router.post('/logout', protect, logout);

// Reachable while must_change_password is set: this is the endpoint that
// clears it, so it must not sit behind requirePasswordChange.
router.put('/change-password', protect, changePassword);

// Unauthenticated by design — the user cannot sign in to reach them.
router.post('/forgot-password', forgotPasswordLimiter, forgotPassword);
router.post('/reset-password/:token', resetPasswordLimiter, resetPassword);

export default router;
