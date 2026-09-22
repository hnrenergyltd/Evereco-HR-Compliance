# Evereco Energy — HR & Sponsor Compliance System

Internal HR system for Evereco Energy: employee records, attendance, absence,
document management, and UK sponsor-licence compliance tracking.

---

## Stack

| | |
|---|---|
| Backend | Node.js 20+ · Express · SQLite (`pg` present for a future port) |
| Frontend | React 18 · Vite · React Router |
| Auth | JWT (30-minute expiry) · bcrypt |
| Email | SMTP via nodemailer |
| Hosting | Railway — two services from this repository |

---

## Layout

```
backend/
  src/
    server.js              entry point
    config/database.js     connection, migrations, column reconciler
    routes/                auth · employees · dashboard · admin
    controllers/           request handling and business logic
    middleware/            auth · rate limiting · upload · error handling
    utils/                 password policy · mailer
    migrations/            *.sql, applied in order on boot
  testEmail.js             SMTP connectivity check

frontend/
  src/
    components/            UI, including tabs/ for the employee profile
    services/              api client · session guard
    utils/                 password policy (mirrors the backend)

docs/                      see below
```

Attendance, absence, documents and sponsorship live inside
`controllers/` and are routed under `/api/employees/:id/...` rather than as
top-level resources. There is no separate `attendance.js` route file; that is
intentional, not an omission.

---

## Running locally

Requires **Node 20.17+** (`sqlite3@6` will not build on 18).

```bash
# Backend — http://localhost:5000
cd backend
npm install
cp .env.example .env     # then fill in JWT_SECRET
npm start

# Frontend — http://localhost:5173
cd frontend
npm install
npm run dev
```

The database file and schema are created on first boot. Migrations run
automatically, and a reconciler adds any columns missing from older databases.

Check SMTP separately:

```bash
cd backend && npm run test:email
```

---

## Configuration

Every variable is documented in `backend/.env.example` (local) and
`backend/.env.railway.example` (deployed). The ones that matter most:

| Variable | Notes |
|---|---|
| `JWT_SECRET` | **Required.** The server exits on boot in production if unset or left at the placeholder |
| `DATABASE_URL` | `sqlite:./evereco_dev.db` locally; on Railway must sit inside the mounted volume |
| `DOCUMENT_STORAGE_PATH` | Where uploads are written. Must be inside the volume when deployed |
| `CORS_ORIGIN` | Front-end origin. Never `*` |
| `APP_URL` | Front-end URL, used for links inside emails |
| `SMTP_*` | Without these, emails are printed to the log instead of sent |

`.env` is gitignored, along with `*.db` and `secure_documents/` — those hold
live employee data and must not reach the repository.

---

## Documentation

| | |
|---|---|
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Railway setup, step by step, and troubleshooting |
| [docs/DATABASE.md](docs/DATABASE.md) | Why SQLite for now, and what a PostgreSQL port actually costs |
| [docs/SECURITY.md](docs/SECURITY.md) | What is enforced, and what is still open |
| [docs/SMTP_SETUP.md](docs/SMTP_SETUP.md) | Gmail App Passwords and other providers |
| [docs/API_REFERENCE.md](docs/API_REFERENCE.md) | All endpoints with access levels |

The `*.md` files in the repository root predate these and are **not maintained**
— several describe a structure the code no longer has. Treat `docs/` as
authoritative.

---

## Deploying

Two Railway services from this one repository, with **Root Directory** set to
`backend` and `frontend` respectively, plus a volume mounted at `/app/data`.

The failure mode worth knowing in advance: Railway rebuilds the container
filesystem on every deploy, so the database and uploaded documents must live on
a mounted volume or they are destroyed on the next push. It fails silently — the
first deploy looks fine. Full instructions in
[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

---

## Known limitations

- Runs on SQLite; the queries use SQLite-only syntax, so PostgreSQL needs a real
  port rather than a connection-string change ([DATABASE.md](DATABASE.md)).
- No encryption at rest, no automated backups, no MFA
  ([SECURITY.md](docs/SECURITY.md) has the full list).
- Logout is client-side; tokens stay valid until they expire.
