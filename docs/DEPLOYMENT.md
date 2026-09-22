# Deploying to Railway

The system deploys as **two Railway services from one repository**: the Express
API (`backend/`) and the static React build (`frontend/`). They are separate
services because they run differently — the API is a long-lived Node process,
the front end is a set of files served by a static server.

---

## Before you start

Two things must be settled or the deployment will come up broken.

**1. The database.** The application targets SQLite and its queries use
SQLite-only syntax. Pointing `DATABASE_URL` at Railway's PostgreSQL without
porting the SQL first will fail at runtime — see [DATABASE.md](DATABASE.md).
Until that port is done, run SQLite on a mounted volume.

**2. Storage must be on a volume.** Railway rebuilds the container filesystem on
every deploy. Anything written outside a mounted volume — the SQLite file,
uploaded passports and contracts — is destroyed on the next push. This is the
most common way to lose data on Railway, and it fails silently: the first deploy
looks fine.

---

## 1. Push the repository

From the project root:

```bash
git add .
git commit -m "Prepare for Railway deployment"
git remote add origin https://github.com/YOUR_USERNAME/evereco-energy-hr.git
git push -u origin main
```

Confirm `backend/.env` is **not** in the push. It holds the JWT secret and the
SMTP password:

```bash
git ls-files | grep "\.env$"    # must print nothing
```

Only `.env.example` and `.env.railway.example` belong in the repository.

---

## 2. Create the backend service

1. Railway → **New Project** → **Deploy from GitHub repo**.
2. Select the repository.
3. Open the service's **Settings** and set **Root Directory** to `backend`.
   Without this Railway builds from the repository root, finds no
   `package.json`, and the build fails.

Railway reads `backend/Procfile` (`web: node src/server.js`) to start the
process, and `engines.node` from `package.json` to pick the runtime. That field
is `>=20.17.0` because `sqlite3@6` will not build on Node 18.

---

## 3. Add the volume

Still in the backend service: **Settings → Volumes → New Volume**, mount path
`/app/data`.

Then set the two variables that point at it:

```
DATABASE_URL=sqlite:/app/data/evereco.db
DOCUMENT_STORAGE_PATH=/app/data/secure_documents
```

Both directories are created automatically on first boot.

---

## 4. Set the backend variables

**Variables** tab. The full annotated list is in
`backend/.env.railway.example`; every name there is one the code actually reads.

The ones that will stop the deploy if wrong:

| Variable | Notes |
|---|---|
| `JWT_SECRET` | **Required.** The server exits on boot in production if this is missing or still the placeholder. Generate: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `NODE_ENV` | `production` — also enables `trust proxy` so rate limiting sees real client IPs rather than Railway's proxy |
| `CORS_ORIGIN` | The front-end URL. Not `*`; the browser is refused otherwise |
| `APP_URL` | The front-end URL again — used to build links inside emails |
| `ADMIN_PASSWORD` | Must meet the policy: 12+ chars, uppercase, number, symbol |

Do **not** set `PORT`. Railway injects it, and the server already reads
`process.env.PORT`. Overriding it makes the health check fail.

---

## 5. Create the frontend service

**New Service → GitHub repo**, same repository, **Root Directory** `frontend`.

`frontend/Procfile` builds and serves the static output:

```
web: npm run build && npm install -g serve && serve -s dist -l $PORT
```

Set one variable, pointing at the backend's public URL:

```
VITE_API_URL=https://your-backend.up.railway.app/api
```

This is read at **build** time, not run time. Changing it later requires a
redeploy, not just a restart.

---

## 6. Close the loop between the two

Each service needs the other's URL, so this is a second pass:

1. Copy the frontend URL → set `CORS_ORIGIN` and `APP_URL` on the **backend**.
2. Copy the backend URL → set `VITE_API_URL` on the **frontend**.
3. Redeploy both.

Until this is done the browser will show CORS errors, and password-reset emails
will contain links pointing at `localhost`.

---

## 7. Verify

```bash
curl https://your-backend.up.railway.app/api/health
# {"status":"OK","timestamp":"..."}
```

Backend logs on a healthy boot:

```
✅ SQLite database connected
✅ Database schema initialized
✅ Email Service Ready
✅ Server running on http://localhost:<PORT>
```

Then, in a browser:

- Sign in as the admin.
- Change the admin password immediately (Navbar → Change Password).
- Upload a document, then **push a trivial commit and redeploy**. If the
  document is still there afterwards, the volume is mounted correctly. This is
  worth doing once — it is the check that catches a misconfigured volume before
  real data is lost.

---

## Troubleshooting

**Build fails, no `package.json` found**
Root Directory is not set. It must be `backend` (or `frontend`), not the
repository root.

**Build fails compiling `sqlite3`**
Node version too old. `engines.node` must allow 20.17+.

**Service starts then immediately exits**
Almost always `JWT_SECRET`. The server calls `process.exit(1)` in production
when it is missing or unchanged — deliberately, since otherwise it would issue
forgeable tokens. The reason is printed as the last log line.

**Health check times out**
`PORT` has been set manually. Remove it.

**Browser shows CORS errors**
`CORS_ORIGIN` does not exactly match the front-end origin. Scheme and host must
match, with no trailing slash.

**Emails are not arriving**
Check the logs for `Email Service Ready`. If SMTP is unset, the service falls
back to printing messages to the log — which also means temporary passwords and
reset links are sitting in your Railway logs. Configure SMTP before going live.

**Everything works, then data disappears after a deploy**
The volume is not mounted, or `DATABASE_URL` / `DOCUMENT_STORAGE_PATH` point
outside it. Both must be under the mount path.
