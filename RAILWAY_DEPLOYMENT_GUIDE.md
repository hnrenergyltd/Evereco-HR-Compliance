# 🚂 RAILWAY DEPLOYMENT GUIDE
## Evereco Energy HR System - Complete Deployment Instructions

---

## 📋 TABLE OF CONTENTS
1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Railway Account Setup](#railway-account-setup)
3. [Backend Deployment](#backend-deployment)
4. [Frontend Deployment](#frontend-deployment)
5. [Database Configuration](#database-configuration)
6. [Environment Variables](#environment-variables)
7. [Post-Deployment Verification](#post-deployment-verification)
8. [Troubleshooting](#troubleshooting)

---

## ✅ PRE-DEPLOYMENT CHECKLIST

- [ ] All code committed to git repository
- [ ] No hardcoded secrets in code (all in .env files)
- [ ] Database migrations are PostgreSQL-ready
- [ ] Both backend and frontend package.json files are complete
- [ ] Procfile files exist in both directories
- [ ] .env.railway.example files created and documented
- [ ] API endpoint documentation ready
- [ ] Database backup strategy planned
- [ ] Monitoring/logging setup decided
- [ ] Admin credentials generated and secured

---

## 🔐 RAILWAY ACCOUNT SETUP

### Step 1: Create Railway Project
1. Go to [railway.app](https://railway.app)
2. Sign in with GitHub/email
3. Click "New Project"
4. Select "Deploy from GitHub"
5. Connect your GitHub repository
6. Select the Evereco HR repository

### Step 2: Create Project Structure
Railway will auto-detect the project type. We have separate frontend and backend:

```
evereco-hr-system/
├── backend/        (Express API)
├── frontend/       (React Vite)
└── RAILWAY_DEPLOYMENT_GUIDE.md
```

---

## 🔧 BACKEND DEPLOYMENT

### Step 1: Create Backend Service
1. In Railway dashboard, click "Add Service"
2. Select "GitHub" and choose the backend folder
3. Configure the service:
   - **Service Name**: `evereco-hr-backend`
   - **Root Directory**: `backend`
   - **Environment**: `Node.js`

### Step 2: Configure Build Settings
```
Build Command: npm install
Start Command: npm start
```

### Step 3: Add PostgreSQL Database
1. Click "Add Service" → "Database" → "PostgreSQL"
2. Railway will automatically:
   - Create a PostgreSQL instance
   - Generate `DATABASE_URL` environment variable
   - Inject it into your backend service

### Step 4: Set Environment Variables
Click "Variables" in backend service and add:

```env
NODE_ENV=production
PORT=3000
JWT_SECRET=<generate-secure-random-secret>
JWT_EXPIRE=7d
BCRYPT_ROUNDS=10
ADMIN_EMAIL=admin@everecoenergy.com
ADMIN_PASSWORD=<secure-temporary-password>
LOG_LEVEL=info
FRONTEND_URL=https://your-frontend-domain.railway.app
```

**To generate JWT_SECRET:**
```bash
openssl rand -base64 32
```

### Step 5: Deploy
- Railway auto-deploys on every push to main branch
- Or click "Deploy" button to manual deploy
- Monitor logs in Dashboard

---

## 🎨 FRONTEND DEPLOYMENT

### Step 1: Create Frontend Service
1. Click "Add Service" → "GitHub"
2. Configure the service:
   - **Service Name**: `evereco-hr-frontend`
   - **Root Directory**: `frontend`
   - **Environment**: `Node.js`

### Step 2: Configure Build Settings
```
Build Command: npm run build
Start Command: serve -s dist -l $PORT
```

**Note:** Frontend needs `serve` package. Add to package.json:
```json
{
  "devDependencies": {
    "serve": "^14.0.0"
  }
}
```

### Step 3: Set Environment Variables
Click "Variables" and add:

```env
VITE_API_URL=https://your-railway-backend-domain.railway.app/api
VITE_APP_NAME=Evereco Energy HR System
```

### Step 4: Generate Domain
1. Click on frontend service
2. Go to "Settings" → "Domain"
3. Click "Generate Domain"
4. Copy the domain (e.g., `evereco-hr-frontend-production.up.railway.app`)

### Step 5: Deploy
- Railway auto-deploys on push
- Visit the generated domain to verify

---

## 🗄️ DATABASE CONFIGURATION

### PostgreSQL Migration from SQLite

The system currently uses SQLite but will migrate to PostgreSQL on Railway.

#### Migration Steps:

**Step 1: Database Auto-Creation**
When you add PostgreSQL to Railway:
- A new database is automatically created
- `DATABASE_URL` is injected into your backend

**Step 2: Run Migrations**
The backend automatically runs migrations on startup:
1. Reads `src/migrations/001_initial_schema_postgres.sql`
2. Creates all tables with proper indexes
3. Applies foreign key constraints

**Step 3: Data Migration (if needed)**
If migrating existing data from SQLite:

```bash
# Export from SQLite
sqlite3 evereco_dev.db .dump > export.sql

# Import to PostgreSQL
psql $DATABASE_URL < export.sql
```

**Step 4: Verify Tables**
```bash
psql $DATABASE_URL -c "\dt"
```

---

## 🔑 ENVIRONMENT VARIABLES

### Backend Required Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Server port (auto-assigned by Railway) | Leave empty |
| `DATABASE_URL` | PostgreSQL connection (auto-generated) | `postgresql://...` |
| `JWT_SECRET` | JWT signing secret | `<random-base64>` |
| `JWT_EXPIRE` | Token expiration | `7d` |
| `BCRYPT_ROUNDS` | Password hash rounds | `10` |
| `ADMIN_EMAIL` | Default admin email | `admin@everecoenergy.com` |
| `ADMIN_PASSWORD` | Default admin password | Change on first login |
| `FRONTEND_URL` | Frontend domain for CORS | `https://frontend.railway.app` |
| `LOG_LEVEL` | Logging level | `info` |

### Frontend Required Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `VITE_API_URL` | Backend API URL | `https://backend.railway.app/api` |
| `VITE_APP_NAME` | App display name | `Evereco Energy HR System` |

---

## ✨ POST-DEPLOYMENT VERIFICATION

### Step 1: Verify Backend
```bash
curl https://your-backend.railway.app/api/health
# Expected response: {"status": "OK", "timestamp": "..."}
```

### Step 2: Verify Frontend
1. Open `https://your-frontend.railway.app` in browser
2. Should see login page
3. No console errors in DevTools

### Step 3: Test Login
```bash
curl -X POST https://your-backend.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@everecoenergy.com",
    "password": "YOUR_ADMIN_PASSWORD"
  }'

# Expected: JWT token in response
```

### Step 4: Verify Database
SSH into Railway container:
```bash
railway connect postgres

# Check tables
\dt

# Count employees
SELECT COUNT(*) FROM employees;
```

### Step 5: Test Full Flow
1. Go to frontend domain
2. Login with admin credentials
3. View employee list
4. View employee profile
5. Check all tabs load correctly

---

## 🐛 TROUBLESHOOTING

### Problem: Backend won't start
**Solution:**
```bash
# Check logs in Railway dashboard
# Common causes:
# - DATABASE_URL not set (should auto-generate from PostgreSQL service)
# - Missing npm dependencies (npm install should run automatically)
# - Port already in use (Railway assigns $PORT automatically)
```

### Problem: Frontend can't reach backend
**Solution:**
1. Verify `VITE_API_URL` is set correctly
2. Check backend domain is accessible
3. Ensure CORS is enabled on backend
4. Check Network tab in browser DevTools

### Problem: Database connection fails
**Solution:**
```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1"

# Check migrations ran
psql $DATABASE_URL -c "\dt"

# Check logs
railway logs postgres
```

### Problem: Login returns 401
**Solution:**
1. Verify admin user exists: `SELECT * FROM users;`
2. Check JWT_SECRET matches
3. Verify password is hashed with bcrypt
4. Check token expiration hasn't passed

### Problem: 502 Bad Gateway
**Solution:**
- Backend crashed or not responding
- Check Railway logs for errors
- Verify environment variables are set
- Check database connection

---

## 📊 MONITORING & LOGGING

### View Logs in Railway
```bash
# Backend logs
railway logs --service evereco-hr-backend

# Frontend logs
railway logs --service evereco-hr-frontend

# Database logs
railway logs --service postgres
```

### Set Up Alerts
1. Go to Railway Project Settings
2. Add email alerts for:
   - Service failures
   - Database connection issues
   - High resource usage

### Performance Monitoring
- Monitor in Railway Dashboard
- Set up optional: New Relic, Sentry, DataDog
- Check response times in browser DevTools

---

## 🔄 CONTINUOUS DEPLOYMENT

### Auto-Deploy Configuration
Railway auto-deploys when you push to main branch:

```bash
# Standard GitHub workflow
git add .
git commit -m "feat: deployment ready"
git push origin main

# Railway will automatically:
# 1. Detect changes
# 2. Install dependencies
# 3. Build project
# 4. Run migrations
# 5. Restart services
```

---

## 🚨 IMPORTANT SECURITY NOTES

### Before Going Live:

1. **Change Admin Password**
   - Log in first time with temporary password
   - Immediately change to secure password
   - Never commit real passwords to git

2. **Rotate JWT_SECRET**
   - Generate new secret regularly
   - Existing tokens become invalid
   - Users must re-login

3. **Enable HTTPS**
   - Railway provides free SSL/TLS
   - All data encrypted in transit

4. **Database Backups**
   - Enable automatic backups in Railway
   - Set backup retention policy
   - Test restore procedures

5. **Audit Logging**
   - System logs all admin actions
   - Review audit_history table regularly
   - Monitor for suspicious activity

---

## 📞 SUPPORT & RESOURCES

- **Railway Docs**: https://docs.railway.app
- **Node.js Deployment**: https://docs.railway.app/deploy/nodejs
- **PostgreSQL**: https://docs.railway.app/databases/postgresql
- **Troubleshooting**: https://docs.railway.app/help/troubleshoot

---

## ✅ DEPLOYMENT CHECKLIST

Before clicking "Deploy":

- [ ] All environment variables configured
- [ ] Database service added and connected
- [ ] PostgreSQL migrations ready
- [ ] Backend Procfile correct
- [ ] Frontend Procfile correct
- [ ] Admin credentials generated and secured
- [ ] JWT_SECRET generated (use `openssl rand -base64 32`)
- [ ] VITE_API_URL points to correct backend domain
- [ ] Health endpoint responds 200
- [ ] Login test successful
- [ ] Database tables created
- [ ] Audit logging working
- [ ] Monitoring configured

---

**Last Updated:** September 19, 2026
**Version:** 1.0.0 - Production Ready
**Status:** ✅ READY FOR DEPLOYMENT (with checklist completion)
