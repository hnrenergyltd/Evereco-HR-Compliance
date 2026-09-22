# API reference

Base URL: `/api`. All responses are JSON.

**Access column:** `public` needs no token · `auth` needs a valid bearer token ·
`admin` additionally requires `role === "admin"`.

Note that attendance, absence, documents and sponsorship are **nested under
`/api/employees/:id/...`** rather than being top-level resources. The `:id` is
an **employee** id, which is a different id space from the `users` row behind
the token.

---

## Authentication

```
Authorization: Bearer <token>
```

Tokens expire after 30 minutes. An expired token returns 401 with
`Session expired. Please sign in again.`

While a user has `must_change_password` set, every endpoint below returns
**403** except `/auth/change-password`, `/auth/me` and `/auth/logout`.

| Method | Path | Access |
|---|---|---|
| POST | `/api/auth/login` | public |
| POST | `/api/auth/forgot-password` | public |
| POST | `/api/auth/reset-password/:token` | public |
| GET | `/api/auth/me` | auth |
| POST | `/api/auth/logout` | auth |
| PUT | `/api/auth/change-password` | auth |

**POST `/api/auth/login`**

```json
{ "email": "admin@evereco.com", "password": "..." }
```

```json
{
  "token": "eyJ...",
  "mustChangePassword": false,
  "user": { "id": 1, "email": "...", "role": "admin", "name": "...", "employee_id": null }
}
```

Returns 401 `Invalid credentials` for both an unknown address and a wrong
password. Limited to 5 failed attempts per 15 minutes.

**PUT `/api/auth/change-password`**

```json
{ "currentPassword": "...", "newPassword": "..." }
```

New password must be 12+ characters with an uppercase letter, a number and a
symbol, and differ from the current one. 401 if the current password is wrong,
400 with a message naming the specific unmet rule otherwise.

**POST `/api/auth/forgot-password`**

```json
{ "email": "user@example.com" }
```

Always returns `{"message":"If email exists, reset link sent"}` — including when
rate-limited — so the endpoint cannot be used to discover registered addresses.
3 requests per email per hour.

**POST `/api/auth/reset-password/:token`**

```json
{ "newPassword": "..." }
```

Single use, valid one hour. Invalid and expired tokens both return 400
`This reset link is invalid or has expired`.

---

## Employees

| Method | Path | Access |
|---|---|---|
| GET | `/api/employees` | auth |
| GET | `/api/employees/:id` | auth |
| POST | `/api/employees` | admin |
| PUT | `/api/employees/:id` | admin |
| DELETE | `/api/employees/:id` | admin |
| PUT | `/api/employees/:id/personal` | auth |
| GET | `/api/employees/:id/employment` | auth |
| PUT | `/api/employees/:id/employment` | admin |
| GET | `/api/employees/:id/sensitive` | auth |
| PUT | `/api/employees/:id/sensitive` | admin |

An employee reading `/api/employees` receives only their own record. Requesting
another employee's id returns 403.

`/employment` carries salary and `/sensitive` carries passport and NI details.
Both are readable by the employee they belong to and by admins; cross-employee
access is 403.

**POST `/api/employees`** creates the employee *and* a linked user account.

```json
{
  "first_name": "Jane", "surname": "Doe",
  "email": "jane@example.com",
  "job_title": "Analyst", "department": "Operations",
  "employment_status": "Active",
  "send_login_email": true
}
```

```json
{
  "id": 12,
  "temp_password": "WdJP4Hm!P^QtwN*r",
  "email_sent": true,
  "message": "Employee created. Login details have been emailed to them."
}
```

`temp_password` is returned once and cannot be retrieved later. The account is
flagged `must_change_password`. `email_sent` is `false` when SMTP is not
configured or delivery failed — the account still exists.

---

## Emergency contacts

| Method | Path | Access |
|---|---|---|
| GET | `/api/employees/:id/emergency-contacts` | auth |
| POST | `/api/employees/:id/emergency-contacts` | auth |
| PUT | `/api/employees/:id/emergency-contacts/:contactId` | auth |
| DELETE | `/api/employees/:id/emergency-contacts/:contactId` | auth |

---

## Attendance

| Method | Path | Access |
|---|---|---|
| GET | `/api/employees/:id/attendance` | auth |
| GET | `/api/employees/:id/attendance/status` | auth |
| POST | `/api/employees/:id/attendance/clock-in` | auth |
| PUT | `/api/employees/:id/attendance/:recordId/clock-out` | auth |
| POST | `/api/employees/:id/attendance/:recordId/correction` | auth |
| POST | `/api/employees/:id/attendance/retrospective` | admin |

Employees request corrections; only an admin approves them (see Admin below).

---

## Absence

| Method | Path | Access |
|---|---|---|
| GET | `/api/employees/:id/absence/summary` | auth |
| GET | `/api/employees/:id/absence/history` | auth |
| POST | `/api/employees/:id/absence/request` | auth |
| POST | `/api/employees/:id/absence/add` | admin |
| PATCH | `/api/employees/:id/absence/:absenceId/approve` | admin |
| PATCH | `/api/employees/:id/absence/:absenceId/reject` | admin |
| DELETE | `/api/employees/:id/absence/:absenceId` | admin |

Requests validate that the end date is after the start date. Approve and reject
email the employee the decision; reject includes `notes` as the reason.

---

## Documents

| Method | Path | Access |
|---|---|---|
| POST | `/api/employees/:id/documents` | admin |
| GET | `/api/employees/:id/documents` | auth |
| GET | `/api/employees/document/:documentId` | auth |
| POST | `/api/employees/document/:documentId/download-token` | auth |
| GET | `/api/employees/document/:documentId/download` | auth |
| PATCH · PUT | `/api/employees/document/:documentId` | admin |
| POST | `/api/employees/document/:documentId/replace` | admin |
| DELETE | `/api/employees/document/:documentId` | admin |
| GET | `/api/employees/documents/all/list` | admin |
| GET | `/api/employees/documents/expiring-soon/list` | admin |

**Upload** is `multipart/form-data` with the file under `file`. Max 10 MB;
PDF, JPEG, PNG, Word, Excel only. Limited to 50 uploads per hour.

**List** is paginated and returns an envelope:

```
GET /api/employees/1/documents?page=2&limit=25&category=Identity&search=passport
```

```json
{
  "documents": [ ... ],
  "total": 47, "page": 2, "limit": 25, "totalPages": 2,
  "hasNextPage": false, "hasPreviousPage": true
}
```

`limit` accepts only 10, 25 or 50; anything else falls back to 10. An
out-of-range `page` is clamped. `total` reflects the caller's own visibility, so
an employee's count excludes documents hidden from them.

`file_path` is never present in any response.

**Download is two steps** — `POST .../download-token` returns a short-lived
token, then `GET .../download?token=...` streams the file.

**Edit** accepts `document_name`, `category`, `document_date`, `expiry_date`,
`notes`, `employee_visibility`. `employee_id`, `uploaded_by`, `uploaded_at`,
`file_path` and `file_size` are immutable and silently excluded. The response
lists `changed_fields`; the audit entry records only what actually changed.

**Delete is soft** — the row is flagged, not removed.

---

## Sponsorship

| Method | Path | Access |
|---|---|---|
| GET | `/api/employees/:id/sponsorship` | auth |
| PATCH | `/api/employees/:id/sponsorship/toggle` | admin |
| PATCH | `/api/employees/:id/sponsorship/cos` | admin |
| PATCH | `/api/employees/:id/sponsorship/immigration` | admin |
| POST | `/api/employees/:id/sponsorship/rtw-checks` | admin |
| PATCH | `/api/employees/:id/sponsorship/rtw-checks/:checkId` | admin |
| DELETE | `/api/employees/:id/sponsorship/rtw-checks/:checkId` | admin |
| GET | `/api/employees/:id/sponsorship/alerts` | admin |

---

## Dashboard and admin

| Method | Path | Access |
|---|---|---|
| GET | `/api/dashboard` | auth |
| GET | `/api/admin/attendance/today` | admin |
| GET | `/api/admin/attendance/corrections` | admin |
| PUT | `/api/admin/attendance/corrections/:correctionId/approve` | admin |
| PUT | `/api/admin/attendance/corrections/:correctionId/reject` | admin |
| GET | `/api/admin/absence/pending` | admin |

`GET /api/dashboard` returns
`{ totalEmployees, workingToday, absentToday, sponsoredWorkers }`.

---

## Health

`GET /api/health` — public, no token. Returns
`{ "status": "OK", "timestamp": "..." }`. Used by Railway's health check.

---

## Errors

| Status | Meaning |
|---|---|
| 400 | Validation failed — body names the specific problem |
| 401 | Missing, invalid or expired token; wrong credentials |
| 403 | Authenticated but not permitted; or password change required |
| 404 | Not found |
| 413 | Body over 1 MB, or upload over 10 MB |
| 429 | Rate limit exceeded |
| 500 | Server error — generic body; detail is server-side only |

```json
{ "error": "Human-readable message" }
```

5xx responses are deliberately generic. Internal messages carry SQL fragments
and file paths, so they are logged rather than returned.
