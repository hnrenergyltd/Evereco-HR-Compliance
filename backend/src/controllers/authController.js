import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';
import { validatePassword, generateResetToken, hashResetToken } from '../utils/password.js';
import { sendPasswordResetEmail } from '../utils/mailer.js';

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '10', 10);

/*
 * A bcrypt hash of a value no password will match. Comparing against it when
 * the account does not exist keeps the response time for "unknown email" and
 * "wrong password" alike, so the endpoint cannot be used to enumerate users.
 */
const DUMMY_HASH = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

/*
 * Security events go to audit_history. Failures are recorded without the
 * submitted password, and never reveal in the response which part was wrong.
 */
async function recordAuthEvent(userId, action, email) {
  try {
    await query(
      `INSERT INTO audit_history (user_id, action, entity_type, created_at)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
      [userId, `${action}: ${email}`, 'auth']
    );
  } catch (err) {
    console.log('⚠️  Audit trail error:', err.message);
  }
}

export async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  const result = await query(
    `SELECT id, email, name, role, employee_id, password_hash, must_change_password
     FROM users WHERE email = ?`,
    [email]
  );

  const user = result.rows[0];
  const passwordMatch = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);

  if (!user || !passwordMatch) {
    await recordAuthEvent(user ? user.id : null, 'Failed login attempt', email);
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  /*
   * Claims carry only what authorisation needs. Nothing sensitive goes in:
   * a JWT is signed, not encrypted, so anyone holding it can read the payload.
   */
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, employee_id: user.employee_id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '30m' }
  );

  await recordAuthEvent(user.id, 'Login', user.email);

  res.json({
    token,
    // The client uses this to divert straight to the forced-change screen. The
    // token is still issued, because changing the password is itself an
    // authenticated call — requirePasswordChange blocks everything else.
    mustChangePassword: Boolean(user.must_change_password),
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      employee_id: user.employee_id,
    },
  });
}

export async function getCurrentUser(req, res) {
  const result = await query(
    'SELECT id, email, name, role, employee_id, must_change_password FROM users WHERE id = ?',
    [req.user.id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }

  const user = result.rows[0];
  res.json({ ...user, must_change_password: Boolean(user.must_change_password) });
}

export async function logout(req, res) {
  await recordAuthEvent(req.user.id, 'Logout', req.user.email || '');
  res.json({ message: 'Logged out successfully' });
}

/*
 * Change the signed-in user's own password. Works both for a routine change
 * from Settings and for the forced change after a temporary password, which is
 * why it is reachable while must_change_password is set.
 */
export async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new password are required' });
  }

  const policyError = validatePassword(newPassword);
  if (policyError) {
    return res.status(400).json({ error: policyError });
  }

  const result = await query('SELECT id, email, password_hash FROM users WHERE id = ?', [
    req.user.id,
  ]);
  const user = result.rows[0];
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const matches = await bcrypt.compare(currentPassword, user.password_hash);
  if (!matches) {
    await recordAuthEvent(user.id, 'Failed password change (wrong current password)', user.email);
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  // Compared against the stored hash rather than the submitted string, so
  // this also catches a "new" password that only differs by having been
  // re-typed identically.
  const sameAsOld = await bcrypt.compare(newPassword, user.password_hash);
  if (sameAsOld) {
    return res.status(400).json({ error: 'New password must be different from the current one' });
  }

  const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await query(
    `UPDATE users
     SET password_hash = ?, must_change_password = 0,
         password_reset_token = NULL, password_reset_expires = NULL,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [hash, user.id]
  );

  await recordAuthEvent(user.id, 'Password changed', user.email);
  res.json({ success: true, message: 'Password changed successfully' });
}

/*
 * Issue a reset link. The response is identical whether or not the address is
 * registered, so this cannot be used to discover which emails have accounts.
 */
export async function forgotPassword(req, res) {
  const { email } = req.body;
  const genericResponse = { message: 'If email exists, reset link sent' };

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const result = await query('SELECT id, email, name FROM users WHERE email = ?', [email]);
  const user = result.rows[0];

  if (!user) {
    await recordAuthEvent(null, 'Password reset requested for unknown email', email);
    return res.json(genericResponse);
  }

  const { raw, hash } = generateResetToken();
  const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  await query(
    `UPDATE users SET password_reset_token = ?, password_reset_expires = ?,
            updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [hash, expires, user.id]
  );

  await sendPasswordResetEmail({ to: user.email, token: raw });
  await recordAuthEvent(user.id, 'Password reset link issued', user.email);

  res.json(genericResponse);
}

/*
 * Consume a reset token. Single use: the token is cleared in the same
 * statement that sets the new password, and that statement re-checks the token
 * and expiry so two concurrent requests cannot both succeed.
 */
export async function resetPassword(req, res) {
  const { token } = req.params;
  const { newPassword } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Reset token is required' });
  }

  const policyError = validatePassword(newPassword);
  if (policyError) {
    return res.status(400).json({ error: policyError });
  }

  const tokenHash = hashResetToken(token);
  const result = await query(
    `SELECT id, email, password_reset_expires FROM users
     WHERE password_reset_token = ?`,
    [tokenHash]
  );
  const user = result.rows[0];

  // Same message for "no such token" and "expired": a caller holding an
  // invalid token learns nothing about why it failed.
  const invalid = { error: 'This reset link is invalid or has expired' };
  if (!user) {
    return res.status(400).json(invalid);
  }

  if (!user.password_reset_expires || new Date(user.password_reset_expires) < new Date()) {
    await query(
      `UPDATE users SET password_reset_token = NULL, password_reset_expires = NULL WHERE id = ?`,
      [user.id]
    );
    await recordAuthEvent(user.id, 'Expired password reset token used', user.email);
    return res.status(400).json(invalid);
  }

  const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  const update = await query(
    `UPDATE users
     SET password_hash = ?, must_change_password = 0,
         password_reset_token = NULL, password_reset_expires = NULL,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND password_reset_token = ?`,
    [hash, user.id, tokenHash]
  );

  if (!update.changes) {
    return res.status(400).json(invalid);
  }

  await recordAuthEvent(user.id, 'Password reset completed', user.email);
  res.json({ success: true, message: 'Password reset successfully' });
}
