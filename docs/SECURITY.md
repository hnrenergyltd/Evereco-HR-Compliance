# Security

What is enforced, where it lives, and what is still open. Written for whoever
maintains or deploys this system.

---

## Authentication

Passwords are hashed with **bcrypt** (cost 10, `BCRYPT_ROUNDS`). Nothing stores
or logs a plaintext password.

Access tokens are JWTs with a **30-minute** expiry (`JWT_EXPIRE`). They are
short-lived deliberately: there is no refresh token and no server-side
revocation, so a leaked token is usable until it expires. Claims contain only
`id`, `email`, `role` and `employee_id` — a JWT is signed, not encrypted, so
anyone holding one can read the payload.

`JWT_SECRET` is mandatory. The server **exits on boot** in production if it is
missing or still the committed placeholder, rather than running with a key that
anyone with repository access could use to forge admin tokens.

Login returns the same `Invalid credentials` for an unknown address and a wrong
password, and compares against a dummy hash when no user exists so the two take
the same time. Without that, response timing alone reveals which addresses have
accounts.

---

## Authorization

Two roles: `admin` and `employee`. Checks are in the controllers, at the point
of use — the frontend hiding a button is presentation, not a control.

Employees reach only their own record. Verified:

```
employee → /employees/2              403
employee → /employees/2/employment   403   (salary)
employee → /employees/2/sensitive    403   (passport, NI number)
employee → /employees/2/documents    403
employee → /employees/2/sponsorship  403
employee → approve own absence       403
employee → own record                200
```

Authorization compares `req.user.employee_id` — the linked employee — not
`req.user.id`, which is a `users` row. These are separate ID spaces and
comparing the wrong one lets an employee reach another's records whenever the
numbers happen to coincide.

---

## Rate limiting

| Endpoint | Limit | Window |
|---|---|---|
| `POST /auth/login` | 5 | 15 min |
| `POST /auth/forgot-password` | 3 per email | 1 hour |
| `POST /auth/reset-password/:token` | 10 | 1 hour |
| Document upload | 50 | 1 hour |
| All `/api` | 500 | 15 min |

Login counts only **failures**, so ordinary use never locks a user out.

Forgot-password is keyed by email address rather than IP, and its 429 returns
the *same* generic body as a success — a rate-limit response that appeared only
for registered addresses would itself disclose which emails have accounts.

In production `trust proxy` is enabled so limits apply per client rather than
bucketing everyone behind Railway's proxy IP.

---

## Password policy

12+ characters, at least one uppercase, one number, one symbol. Defined once in
`backend/src/utils/password.js` and mirrored for the UI meter in
`frontend/src/utils/passwordPolicy.js`; the server revalidates every submission.

A new password is rejected if it matches the current one, compared against the
stored hash.

Accounts created by an admin get a 16-character generated password and
`must_change_password`. Until it is changed **every endpoint returns 403**
except `/auth/change-password`, `/auth/me` and `/auth/logout`. That flag is read
from the database on each request, not from the JWT — a token minted before the
change would otherwise keep asserting the stale value for its full lifetime.

---

## Reset tokens

32 random bytes. Only the **SHA-256 digest** is stored; the raw value exists
solely in the emailed link, so a database disclosure does not yield usable reset
links. Single-use — cleared in the same statement that sets the password, and
that statement re-checks the token so two concurrent requests cannot both
succeed. Expires after one hour.

Invalid and expired tokens return the same message.

---

## Documents

Stored outside any served path — there is no `express.static` anywhere, so
files are unreachable by URL (`/uploads/1.pdf` → 404). Filenames are UUIDs in
nested UUID directories, and `file_path` is stripped from every API response.

Download requires a short-lived server-issued token, checked against the
requesting user. Deletes are soft (`is_deleted`), preserving the audit trail.

Uploads are capped at 10 MB and restricted to PDF, JPEG, PNG, Word and Excel.

---

## Transport and headers

`helmet()` with `X-Frame-Options: DENY`, `nosniff`, HSTS, `Referrer-Policy`, and
`X-Powered-By` removed. HTTPS is terminated by Railway.

CORS is an explicit allow-list from `CORS_ORIGIN`. Never `*` — a wildcard lets
any site on the internet call the API with a signed-in user's token.

**CSRF middleware is deliberately absent.** CSRF depends on browsers attaching
credentials automatically; this API uses a bearer token from `localStorage`,
which is never sent automatically. There are no cookies, so cookie flags are
moot too. Adding `csurf` here would break every request without adding
protection.

Request bodies are capped at 1 MB.

---

## Errors and audit

Error responses are generic. Full detail — message, stack, path, user — is
logged server-side only; `err.message` on a database or filesystem failure
carries SQL fragments and absolute paths.

`audit_history` records logins, failed logins, logouts, password changes, reset
links issued, expired tokens used, resets completed, employee and salary
changes, and document upload/edit/delete with a field-level diff of what
changed.

---

## Open items

Not implemented, in rough priority order:

1. **No encryption at rest.** The SQLite file and uploaded documents are
   unencrypted on the volume. Anyone with volume access reads everything.
2. **No backups configured.** A volume is not a backup — see
   [DATABASE.md](DATABASE.md).
3. **No MFA.**
4. **No malware scanning on upload.** Type and size are checked; content is not.
5. **No forced rotation for the seeded admin.** Employees created by an admin
   are forced to change; the bootstrap admin is not.
6. **Tokens cannot be revoked.** Logout is client-side only — the JWT stays
   valid until it expires. Mitigated by the 30-minute lifetime.
7. **`localStorage` for tokens.** Readable by any XSS on the origin. No XSS
   vector is currently present (React escapes by default, no
   `dangerouslySetInnerHTML`, no `eval`), but httpOnly cookies would be more
   robust.

---

## Before going live

- [ ] `JWT_SECRET` set to a generated value, unique to the environment
- [ ] Seeded admin password changed from whatever bootstrapped it
- [ ] `CORS_ORIGIN` set to the real front-end origin, not `*`
- [ ] SMTP configured — otherwise credentials are printed to your logs
- [ ] Volume mounted; `DATABASE_URL` and `DOCUMENT_STORAGE_PATH` both under it
- [ ] `git ls-files | grep "\.env$"` prints nothing
- [ ] A backup schedule exists
