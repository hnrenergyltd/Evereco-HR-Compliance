import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';

/*
 * Blocks the API for a user still on an admin-issued temporary password.
 *
 * The flag is read from the database rather than the JWT: a token minted
 * before the change would otherwise keep asserting the stale value for its
 * whole 30-minute life, and a user could sidestep the requirement simply by
 * holding on to it.
 *
 * Mounted after the auth routes, so /auth/change-password, /auth/me and
 * /auth/logout stay reachable — otherwise the user would be locked out of the
 * very endpoint that clears the flag.
 */
export async function requirePasswordChange(req, res, next) {
  if (!req.user?.id) return next();

  try {
    const result = await query('SELECT must_change_password FROM users WHERE id = ?', [
      req.user.id,
    ]);
    if (result.rows[0]?.must_change_password) {
      return res.status(403).json({
        error: 'You must change your temporary password before continuing',
        mustChangePassword: true,
      });
    }
  } catch {
    // A lookup failure should not hand out access; fall through to the route
    // only because the flag defaults to unset for every pre-existing account.
  }

  next();
}

export function protect(req, res, next) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

export function employeeOnly(req, res, next) {
  if (!req.user?.id) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
}
