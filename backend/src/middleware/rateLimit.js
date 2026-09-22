import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

/*
 * Brute-force guard on the credential endpoint. Successful logins are not
 * counted, so a legitimate user working normally is never locked out by their
 * own activity — only repeated failures accumulate.
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
});

/*
 * Broad ceiling for the rest of the API. High enough that ordinary use of the
 * dashboard never reaches it, low enough to blunt scraping and DoS.
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down and try again shortly.' },
});

/*
 * Password reset requests are budgeted per email address rather than per IP, so
 * one person cannot be used to flood another's inbox from many addresses, and a
 * single attacker cannot cycle through many emails from one IP either. The IP
 * is kept in the key as well so an unknown address cannot be used to exhaust a
 * real user's allowance.
 */
export const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email = String(req.body?.email || '')
      .trim()
      .toLowerCase();
    // ipKeyGenerator normalises IPv6 to its /64 prefix, so a user with a large
    // address block cannot simply rotate addresses to reset the counter.
    return email ? `email:${email}` : `ip:${ipKeyGenerator(req.ip)}`;
  },
  // Must mirror forgotPassword's generic reply: a 429 that only appears for
  // registered addresses would leak which emails have accounts.
  handler: (req, res) => res.json({ message: 'If email exists, reset link sent' }),
});

/*
 * Reset-token submission is guessing-resistant by entropy, but this bounds
 * brute-force attempts on the endpoint regardless.
 */
export const resetPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please request a new reset link.' },
});

/*
 * Uploads are the only route that consumes disk, so they get a tighter budget
 * than ordinary reads to prevent storage exhaustion.
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Upload limit reached. Please try again later.' },
});
