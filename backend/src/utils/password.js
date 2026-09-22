import crypto from 'crypto';

export const MIN_PASSWORD_LENGTH = 12;

/*
 * One definition of the policy, used by every path that accepts a password
 * (change, reset, and the generated temporary password) so the rules cannot
 * drift apart between endpoints.
 */
export function validatePassword(password) {
  if (typeof password !== 'string' || password.length === 0) {
    return 'New password is required';
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one number';
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return 'Password must contain at least one symbol';
  }
  return null;
}

/*
 * Temporary password for a newly created account. Built from crypto random
 * bytes and guaranteed to satisfy validatePassword, so an admin never creates
 * an account whose own starting password would be rejected on change.
 *
 * Ambiguous glyphs (O/0, l/I/1) are excluded because this password gets read
 * off a screen or an email and typed by hand.
 */
export function generateTemporaryPassword() {
  const upper = 'ABCDEFGHJKMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnpqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%^&*?';
  const all = upper + lower + digits + symbols;

  const pick = (set) => set[crypto.randomInt(0, set.length)];

  // Seed one of each required class, then fill to length with the full set.
  const chars = [pick(upper), pick(lower), pick(digits), pick(symbols)];
  while (chars.length < 16) chars.push(pick(all));

  // Fisher-Yates with a CSPRNG so the seeded characters are not always first.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
}

/*
 * Reset tokens: the raw value goes in the emailed link, only its SHA-256 digest
 * is stored. A leaked database therefore does not hand over usable reset links.
 * SHA-256 is appropriate here (unlike for passwords) because the input is 32
 * bytes of full-entropy random data, not a guessable human secret.
 */
export function generateResetToken() {
  const raw = crypto.randomBytes(32).toString('hex');
  return { raw, hash: hashResetToken(raw) };
}

export function hashResetToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}
