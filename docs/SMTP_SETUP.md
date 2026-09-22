# Email setup

The system sends four kinds of mail: password-reset links, login credentials
for new employees, and absence approval/rejection notices.

Delivery is plain SMTP via `nodemailer`, so any provider works. There is no
vendor SDK and no provider-specific code.

---

## The fallback, and why it matters

If `SMTP_HOST`, `SMTP_USER` or `SMTP_PASS` is unset, the mailer does not throw —
it **writes the message to the server log instead** and reports
`delivered: false` to the caller. The admin UI then tells whoever created the
account to pass the temporary password on by hand.

That keeps development usable without credentials. It is **not safe in
production**: temporary passwords and reset links would sit in your Railway
logs in plain text, and users would never receive anything.

Confirm the log line on boot before going live:

```
✅ Email Service Ready
   From: your-address@gmail.com
   SMTP: smtp.gmail.com:587
```

If you see `⚠️  Email Service: SMTP not configured`, mail is not being sent.

---

## Gmail

Gmail rejects your normal account password over SMTP. You need an **App
Password**, which requires 2-Step Verification on the account.

1. Enable 2-Step Verification: Google Account → Security.
2. Go to <https://myaccount.google.com/apppasswords>.
3. Create a password for "Mail". Google shows 16 characters in four groups.
4. Use it as `SMTP_PASS`. The spaces are ignored — paste it as shown or without
   them, either works.

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-address@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx
SMTP_FROM=your-address@gmail.com
SMTP_FROM_NAME=Evereco Energy HR
```

Gmail sends roughly 500 messages per day on a free account. That is ample here,
but it is a shared consumer account — for a production HR system, a domain
address on Google Workspace or a transactional provider is more appropriate, not
least because password-reset mail from a personal Gmail address looks like
phishing to recipients.

---

## Other providers

Only the four `SMTP_*` values change.

| Provider | Host | Port | User / Pass |
|---|---|---|---|
| Google Workspace | `smtp.gmail.com` | 587 | Address / App Password |
| Microsoft 365 | `smtp.office365.com` | 587 | Address / account password |
| SendGrid | `smtp.sendgrid.net` | 587 | Literally `apikey` / the API key |
| Mailgun | `smtp.mailgun.org` | 587 | SMTP credentials from the dashboard |

Port 465 is also supported — the transport switches to implicit TLS
automatically when `SMTP_PORT` is 465.

---

## Testing

```bash
cd backend
npm run test:email
```

This verifies the SMTP connection and sends a real password-reset message to
`ADMIN_EMAIL`. It prints the resolved configuration first, so it is also the
quickest way to see which variables are actually reaching the process.

A failure here is almost always one of:

- **`Invalid login`** — using the account password instead of an App Password.
- **`Connection timeout`** — wrong port, or outbound SMTP blocked by the network.
- **`SMTP not configured`** — a variable is missing; check the printed values.

---

## Operational notes

**Delivery failures never fail the request.** If sending throws, the error is
logged and the surrounding operation still succeeds — the employee account is
created, the reset token is issued. This is deliberate: an SMTP outage should
not block HR work. The consequence is that a silent delivery failure is only
visible in the logs, so check them after creating an account if the recipient
reports nothing arrived.

**Credentials are shown once.** A temporary password is displayed to the admin
on screen at creation time and cannot be retrieved afterwards — only reset. The
copy button on that panel exists for exactly this reason.
