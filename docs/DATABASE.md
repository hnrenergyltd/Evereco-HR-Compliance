# Database

The application currently runs on **SQLite**. `backend/src/config/database.js`
also contains a PostgreSQL branch, but the SQL the controllers issue is
SQLite-specific, so that branch is not usable yet.

This document records what "move to PostgreSQL" actually involves, so the
decision can be made with real numbers rather than an estimate.

---

## Why it is not a configuration change

Switching `DATABASE_URL` from `sqlite:` to `postgresql:` selects a different
driver. It does not translate the queries, and the queries do not port cleanly.

### 1. `rowid` — 110 references across 9 files

This is the blocker. Every table uses SQLite's implicit `rowid` as its primary
key, and it is selected, filtered and joined on throughout:

```sql
SELECT rowid as id, first_name FROM employees WHERE rowid = ?
```

**PostgreSQL has no `rowid`.** Every one of these fails outright — not subtly,
not at the edges. The distribution:

| File | References |
|---|---:|
| `controllers/documentsController.js` | 27 |
| `controllers/attendanceController.js` | 24 |
| `controllers/employeeController.js` | 16 |
| `controllers/absenceController.js` | 11 |
| `controllers/emergencyContactController.js` | 10 |
| `controllers/sponsorshipController.js` | 9 |
| `controllers/employmentController.js` | 8 |
| `controllers/sensitiveInformationController.js` | 4 |
| `routes/employees.js` | 1 |

Fixing this means giving every table a real `id` column and rewriting all of
the above — which also changes what `lastID` means on insert.

### 2. Parameter placeholders — 29 insert statements

SQLite uses `?`. PostgreSQL uses `$1, $2, $3`. Every parameterised query needs
rewriting, or the `query()` wrapper needs a translation layer.

### 3. Insert IDs — 6 call sites

`db.run()` exposes `this.lastID` in SQLite. PostgreSQL has no equivalent and
requires `INSERT ... RETURNING id`, with the result read from the returned row.
`query()` in `config/database.js` is built around the SQLite behaviour.

### 4. Schema syntax — 11 migration files

`AUTOINCREMENT` (30 occurrences) is `SERIAL` or `GENERATED AS IDENTITY`.
`datetime('now')` is `NOW()`. `INSERT OR IGNORE` is
`INSERT ... ON CONFLICT DO NOTHING`. `PRAGMA table_info` — used in 4 places,
including the column reconciler that repairs schema drift on boot — becomes an
`information_schema.columns` query.

### 5. Booleans — 18 columns

SQLite stores these as integers `0`/`1`; the code compares and writes them that
way. PostgreSQL has a real `boolean` type and rejects the integers.

---

## Realistic scope

Roughly **175 individual changes** across 9 controllers, the database layer and
11 migration files, followed by a full re-test of all 27 endpoints. This is a
project in its own right, not a deployment step. Attempting it as part of a
deployment is how endpoints get silently broken.

There is a `001_initial_schema_postgres.sql` in the migrations folder, but it
covers only the initial schema — migrations 002 through 011 have no PostgreSQL
equivalent.

---

## Recommendation

**Deploy on SQLite on a mounted volume now. Port to PostgreSQL as a separate,
scheduled piece of work.**

SQLite on a volume is genuinely fine at this scale — a few dozen employees, one
writer process. The real risk to the data is not SQLite; it is an unmounted
volume.

Configure it as:

```
DATABASE_URL=sqlite:/app/data/evereco.db
DOCUMENT_STORAGE_PATH=/app/data/secure_documents
```

with a Railway Volume mounted at `/app/data`.

### When to revisit

PostgreSQL becomes worth the port when any of these become true:

- More than one backend instance is needed. SQLite allows a single writer, so
  horizontal scaling forces the move.
- Point-in-time recovery is required. Railway's managed Postgres backs up
  automatically; a volume does not.
- Concurrent writes start producing `SQLITE_BUSY` under real load.

None of these apply to the current deployment.

---

## Backups (SQLite on a volume)

A Railway Volume survives deploys but is not a backup — it will not help
against an accidental delete or a corrupted file. Until PostgreSQL's automatic
backups are available, copy the database off the volume on a schedule:

```bash
railway run cat /app/data/evereco.db > "backup-$(date +%F).db"
```

The file contains every employee record, password hash and the full audit
trail. Store it encrypted, and treat it with the same care as the production
database itself.
