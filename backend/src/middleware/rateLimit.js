import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

/*
 * Brute-force guard on the credential endpoint, in two layers.
 *
 * The tight limit is keyed by account *and* client rather than by IP alone.
 * Keying on IP alone means everyone behind one office connection shares a
 * single allowance, so one person mistyping their password five times locks
 * out every colleague for fifteen minutes — and because the block happens
 * before any password check, it presents as "no password works for anyone",
 * which looks exactly like a broken authentication system.
 *
 * Including the IP as well as the email keeps an attacker from locking a
 * chosen user out of their own account from somewhere else.
 *
 * Successful logins are not counted, so normal use never accumulates.
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email = String(req.body?.email || '')
      .trim()
      .toLowerCase();
    const ip = ipKeyGenerator(req.ip);
    return email ? `login:${email}:${ip}` : `login:${ip}`;
  },
  message: {
    error:
      'Too many failed attempts for this account. Please wait 15 minutes, or reset your password.',
  },
});

/*
 * Wider ceiling for the same endpoint, keyed by IP. The per-account limit above
 * would otherwise let one client work through a list of addresses, five
 * attempts at a time. Set high enough that a shared office connection doing
 * ordinary work never reaches it.
 */
export const loginIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts from this location. Please try again later.' },
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
