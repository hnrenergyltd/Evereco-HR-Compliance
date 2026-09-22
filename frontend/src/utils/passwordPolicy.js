/*
 * Mirrors backend/src/utils/password.js so the form can give immediate
 * feedback. The server revalidates every submission — this is guidance for the
 * user, never the thing that enforces the policy.
 */
export const MIN_PASSWORD_LENGTH = 12;

export const PASSWORD_RULES = [
  { id: 'length', label: `At least ${MIN_PASSWORD_LENGTH} characters`, test: (p) => p.length >= MIN_PASSWORD_LENGTH },
  { id: 'upper', label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { id: 'number', label: 'One number', test: (p) => /[0-9]/.test(p) },
  { id: 'symbol', label: 'One symbol', test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export function evaluatePassword(password) {
  const value = password || '';
  const results = PASSWORD_RULES.map((rule) => ({ ...rule, passed: rule.test(value) }));
  const met = results.filter((r) => r.passed).length;

  let level = 'weak';
  let label = 'Weak';

  if (met === PASSWORD_RULES.length) {
    // All four rules are the floor, not a strong password on their own —
    // extra length is what actually makes one hard to guess.
    if (value.length >= 16) {
      level = 'strong';
      label = 'Strong';
    } else {
      level = 'good';
      label = 'Good';
    }
  } else if (met >= 2) {
    level = 'fair';
    label = 'Fair';
  }

  return { results, met, total: PASSWORD_RULES.length, level, label, valid: met === PASSWORD_RULES.length };
}
