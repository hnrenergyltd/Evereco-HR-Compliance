# ✅ DEPLOYMENT CHECKLIST
## Evereco Energy HR System - Production Readiness Checklist

---

## 🎯 OVERVIEW
This checklist must be completed **BEFORE** deploying to Railway. Print or save this document and check off each item as completed.

**Estimated Time:** 30-45 minutes  
**Last Updated:** September 19, 2026  
**Version:** 1.0.0

---

## PHASE 1: PRE-DEPLOYMENT REVIEW (5 min)

### Code Review
- [ ] All code committed to git
- [ ] No uncommitted changes in working directory
- [ ] Latest commits are clean (no merge conflicts)
- [ ] Branch is up to date with main

### File Structure
- [ ] `backend/` directory exists with full structure
- [ ] `frontend/` directory exists with full structure
- [ ] `backend/Procfile` exists
- [ ] `frontend/Procfile` exists
- [ ] `.gitignore` ignores `.env` files
- [ ] No `.env` files in git (use `.env.example`)
- [ ] `RAILWAY_DEPLOYMENT_GUIDE.md` created
- [ ] `RAILWAY_CONFIG_CHANGES.md` created

### Dependencies
- [ ] `backend/package.json` has all required dependencies
- [ ] `backend/package.json` has proper Node version in engines
- [ ] `frontend/package.json` has `serve` in devDependencies
- [ ] `npm install` works locally (tested)
- [ ] No vulnerabilities in `npm audit` (acceptable)

---

## PHASE 2: BACKEND CONFIGURATION (10 min)

### Environment Variables
- [ ] `.env.railway.example` exists in backend
- [ ] All required vars documented in example:
  - [ ] `NODE_ENV=production`
  - [ ] `DATABASE_URL` (will be auto-set by Railway PostgreSQL)
  - [ ] `JWT_SECRET` (generate: `openssl rand -base64 32`)
  - [ ] `JWT_EXPIRE=7d`
  - [ ] `BCRYPT_ROUNDS=10`
  - [ ] `ADMIN_EMAIL=admin@everecoenergy.com`
  - [ ] `ADMIN_PASSWORD=<secure-temp-pass>`
  - [ ] `FRONTEND_URL=<to-be-filled-after-frontend-deploy>`
  - [ ] `LOG_LEVEL=info`

### Code Review (No Hardcoded Secrets)
- [ ] `src/server.js` - No hardcoded secrets
- [ ] `src/config/database.js` - Uses env variables
- [ ] `src/middleware/auth.js` - Uses `process.env.JWT_SECRET`
- [ ] `src/controllers/authController.js` - No hardcoded tokens
- [ ] No `.env` file committed to git
- [ ] No API keys in comments
- [ ] No credentials in migration files

### Database Configuration
- [ ] `src/config/database.js` supports PostgreSQL ✅ (already does)
- [ ] Connection string detection working
- [ ] Foreign key constraints enabled
- [ ] Indexes defined for performance

### Procfile
- [ ] `backend/Procfile` exists
- [ ] Content is: `web: node src/server.js`
- [ ] No typos in file name or content

### Scripts in package.json
- [ ] `"start": "node src/server.js"` ✅
- [ ] `"dev": "node --watch src/server.js"` ✅
- [ ] `"migrate": "node src/migrations/runMigrations.js"` (optional)

### Ports Configuration
- [ ] No hardcoded port 5000 in production code
- [ ] Uses `process.env.PORT || 3000` ✅ (already correct)
- [ ] Railway will inject $PORT at runtime

### CORS Configuration
- [ ] Check if CORS needs frontend domain added
- [ ] `app.use(cors())` is okay OR whitelist configured
- [ ] Frontend domain will be added after frontend deployment

### Health Check Endpoint
- [ ] `GET /api/health` endpoint exists ✅
- [ ] Returns `{"status": "OK", "timestamp": "..."}`
- [ ] No authentication required
- [ ] Responds in < 200ms

---

## PHASE 3: FRONTEND CONFIGURATION (8 min)

### Environment Variables
- [ ] `.env.railway.example` exists in frontend
- [ ] Contains:
  - [ ] `VITE_API_URL=https://backend-domain.railway.app/api`
  - [ ] `VITE_APP_NAME=Evereco Energy HR System`

### Code Review
- [ ] `src/services/api.js` uses env variable for API URL ✅
- [ ] No hardcoded localhost in production code
- [ ] No hardcoded API keys

### Build Configuration
- [ ] `vite.config.js` exists
- [ ] Build command: `npm run build`
- [ ] Build creates `dist/` folder
- [ ] Build is successful: `npm run build` ✅
- [ ] Preview works: `npm run preview` ✅

### Dev Proxy (Development Only)
- [ ] Dev proxy configured for localhost development
- [ ] Dev proxy will NOT work in production (expected)
- [ ] Production uses VITE_API_URL directly
- [ ] No errors when VITE_API_URL is absolute URL

### Procfile
- [ ] `frontend/Procfile` exists
- [ ] Content: `web: npm run build && npm install -g serve && serve -s dist -l $PORT`
- [ ] No typos

### Dependencies
- [ ] `serve` is in devDependencies (for production serving)
- [ ] `npm install` includes serve
- [ ] React dependencies present
- [ ] React Router present for navigation
- [ ] Axios present for API calls

### Build Output
- [ ] `dist/` folder exists after build
- [ ] `index.html` in dist folder ✅
- [ ] Assets bundled correctly
- [ ] No console errors during build
- [ ] Bundle size reasonable (< 1MB gzipped)

---

## PHASE 4: DATABASE CONFIGURATION (5 min)

### PostgreSQL Migrations
- [ ] `src/migrations/001_initial_schema_postgres.sql` exists
- [ ] Contains all required tables:
  - [ ] `users`
  - [ ] `employees`
  - [ ] `personal_details`
  - [ ] `sensitive_information`
  - [ ] `emergency_contacts`
  - [ ] `attendance_records`
  - [ ] `absence_records`
  - [ ] `documents`
  - [ ] `sponsorship_records`
  - [ ] `salary_history`
  - [ ] `employment_history`
  - [ ] `audit_history`
  - [ ] `settings`

### Indexes
- [ ] Indexes defined on frequently queried columns:
  - [ ] `users(email)` ✅
  - [ ] `employees(email)` ✅
  - [ ] `employees(deleted_at)` ✅
  - [ ] `attendance_records(employee_id)` ✅
  - [ ] `absence_records(employee_id)` ✅

### Foreign Keys
- [ ] Foreign key constraints defined
- [ ] ON DELETE CASCADE for employee-related tables
- [ ] No circular dependencies

### Migration Execution
- [ ] Backend auto-runs migrations on startup ✅
- [ ] Migrations only run once (idempotent) ✅
- [ ] Errors in migrations don't crash server

---

## PHASE 5: SECURITY REVIEW (5 min)

### Secrets Management
- [ ] No secrets in `.env.example` files (only templates)
- [ ] All secrets in environment variables
- [ ] `.env` files in `.gitignore` ✅
- [ ] JWT_SECRET is 32+ character random string
- [ ] Admin password is temporary (will be changed)

### JWT Configuration
- [ ] JWT_SECRET generated and ready
- [ ] JWT_EXPIRE set to reasonable value (7d)
- [ ] Token verification working
- [ ] Expired tokens properly rejected

### Password Security
- [ ] Bcrypt hashing with 10 rounds ✅
- [ ] No plaintext passwords in database
- [ ] Password comparison uses bcrypt.compare()
- [ ] Admin password hashed before storage

### API Security
- [ ] Authentication required for protected endpoints
- [ ] Role-based access control in place
- [ ] Employees can only see their own data
- [ ] Admins have full access
- [ ] No SQL injection vulnerabilities

### HTTPS
- [ ] Will use Railway's free SSL certificate
- [ ] HTTP redirects to HTTPS
- [ ] Secure cookies configured (if used)

### CORS
- [ ] CORS properly configured
- [ ] Frontend domain will be whitelisted
- [ ] Credentials allowed if needed

---

## PHASE 6: TESTING (10 min)

### Local Testing
- [ ] Backend starts: `npm start` ✅
- [ ] Frontend starts: `npm run dev` ✅
- [ ] Health check: `curl http://localhost:5000/api/health` ✅
- [ ] Login works with correct credentials ✅
- [ ] Login fails with wrong credentials ✅
- [ ] Protected endpoints require authentication ✅
- [ ] Admin can see employee list ✅
- [ ] Employee sees only own profile ✅

### Build Testing
- [ ] Backend builds successfully
- [ ] Frontend builds successfully
- [ ] No console errors
- [ ] No build warnings (or acceptable)

### Integration Testing
- [ ] Database operations working
- [ ] API endpoints responding
- [ ] CRUD operations working
- [ ] Authentication flow complete
- [ ] Authorization working

---

## PHASE 7: DOCUMENTATION (5 min)

### Deployment Guide
- [ ] `RAILWAY_DEPLOYMENT_GUIDE.md` created ✅
- [ ] Contains step-by-step instructions
- [ ] Includes environment variables list
- [ ] Includes troubleshooting section
- [ ] Includes post-deployment verification steps

### Configuration Documentation
- [ ] `RAILWAY_CONFIG_CHANGES.md` created ✅
- [ ] Lists all required changes
- [ ] Explains each configuration
- [ ] Provides before/after examples
- [ ] Includes security notes

### .env.example Files
- [ ] `backend/.env.railway.example` created ✅
- [ ] `frontend/.env.railway.example` created ✅
- [ ] All variables documented
- [ ] No actual secrets in examples

### README Updates (Optional)
- [ ] Installation instructions updated
- [ ] Deployment instructions added
- [ ] Troubleshooting section added
- [ ] Contact/support information

---

## PHASE 8: FINAL PREPARATIONS (2 min)

### Secrets Generation
- [ ] Generate JWT_SECRET: 
  ```bash
  openssl rand -base64 32
  ```
  **Secret Generated:** `_________________________`
  
- [ ] Generate Admin Password:
  ```bash
  openssl rand -base64 16
  ```
  **Temporary Password:** `_________________________`

### Save Credentials Securely
- [ ] JWT_SECRET saved in secure location (1Password, LastPass, etc.)
- [ ] Admin temporary password saved
- [ ] Both secured before deployment
- [ ] Do NOT commit to git

### Final Code Review
- [ ] One final `git log` to verify commits
- [ ] One final `npm audit` to check vulnerabilities
- [ ] One final build test locally
- [ ] One final `git status` - should be clean

### Railway Account Verification
- [ ] Railway account created and verified
- [ ] GitHub connected to Railway
- [ ] Can access Railway dashboard
- [ ] PostgreSQL add-on price understood

---

## PHASE 9: DEPLOYMENT READY? ⚠️

Before clicking "Deploy", verify ALL items above are checked.

### Pre-Deployment Verification
- [ ] **All 80+ items above are CHECKED**
- [ ] Code is committed and pushed to main
- [ ] No uncommitted changes
- [ ] No untracked files that matter
- [ ] Local testing completed successfully
- [ ] Documentation is complete
- [ ] Credentials are generated and secured

### Deployment Approval
- [ ] Product Owner/Manager approved
- [ ] Team lead reviewed this checklist
- [ ] Database backup plan confirmed
- [ ] Monitoring set up (if applicable)
- [ ] Post-deployment testing plan ready

**Who is deploying:** ___________________

**Date of deployment:** ___________________

**Deployment approval:** ___________________

---

## PHASE 10: DEPLOYMENT EXECUTION

### Step 1: Connect Repository
- [ ] Go to railway.app
- [ ] Create new project
- [ ] Connect GitHub repository
- [ ] Select Evereco HR repository

### Step 2: Configure Backend
- [ ] Add backend service from GitHub
- [ ] Set root directory: `backend`
- [ ] Railway detects Node.js environment
- [ ] Build command auto-set to `npm install`
- [ ] Start command auto-set to `npm start`

### Step 3: Add PostgreSQL
- [ ] Add PostgreSQL database service
- [ ] Railway auto-generates `DATABASE_URL`
- [ ] Database URL injected into backend
- [ ] Verify connection string: `postgresql://...`

### Step 4: Configure Backend Env Vars
In Railway backend service, add:
- [ ] `NODE_ENV` = `production`
- [ ] `JWT_SECRET` = `<your-generated-secret>`
- [ ] `JWT_EXPIRE` = `7d`
- [ ] `BCRYPT_ROUNDS` = `10`
- [ ] `ADMIN_EMAIL` = `admin@everecoenergy.com`
- [ ] `ADMIN_PASSWORD` = `<your-temp-password>`
- [ ] `FRONTEND_URL` = `<will-fill-after-frontend>`
- [ ] `LOG_LEVEL` = `info`

### Step 5: Deploy Backend
- [ ] Click Deploy
- [ ] Wait for build to complete (2-3 min)
- [ ] Check logs for errors
- [ ] Verify services started successfully

### Step 6: Configure Frontend
- [ ] Add frontend service from GitHub
- [ ] Set root directory: `frontend`
- [ ] Railway detects Node.js environment

### Step 7: Configure Frontend Env Vars
In Railway frontend service, add:
- [ ] `VITE_API_URL` = `https://backend-service-url/api`
- [ ] `VITE_APP_NAME` = `Evereco Energy HR System`

### Step 8: Deploy Frontend
- [ ] Click Deploy
- [ ] Wait for build to complete (3-5 min)
- [ ] Check logs for errors
- [ ] Frontend should start serving

### Step 9: Update Backend CORS
- [ ] Get frontend domain: `https://evereco-frontend-xxx.railway.app`
- [ ] Update backend `FRONTEND_URL` env var
- [ ] Redeploy backend
- [ ] Wait for restart

---

## PHASE 11: POST-DEPLOYMENT VERIFICATION

### Backend Health Check
- [ ] Test health endpoint:
  ```bash
  curl https://backend-domain/api/health
  ```
  Expected: `{"status":"OK","timestamp":"..."}`
- [ ] Response time < 500ms
- [ ] No 5xx errors

### Frontend Access
- [ ] Open frontend domain in browser
- [ ] Login page loads
- [ ] No console errors in DevTools
- [ ] Network requests show 200 OK

### Login Test
- [ ] Login with admin credentials
- [ ] JWT token received
- [ ] Redirected to dashboard
- [ ] Dashboard loads without errors
- [ ] User data displays correctly

### Employee Data Access
- [ ] Can view employee list (admin)
- [ ] Can view employee profile
- [ ] All tabs load correctly
- [ ] Can see attendance section
- [ ] Clock in/out buttons present

### Database Verification
- [ ] Check tables created:
  ```bash
  railway connect postgres
  \dt
  ```
- [ ] Verify admin user exists:
  ```sql
  SELECT * FROM users WHERE email='admin@everecoenergy.com';
  ```
- [ ] Employee data present (2 employees)

### Employee Login Test
- [ ] Logout from admin
- [ ] Login as sardar@everecoenergy.com
- [ ] See employee dashboard
- [ ] No statistics cards shown
- [ ] See attendance section
- [ ] Can clock in/out

### API Endpoints Test
```bash
# Test each endpoint
curl -H "Authorization: Bearer $TOKEN" https://backend/api/employees
curl -H "Authorization: Bearer $TOKEN" https://backend/api/employees/1
curl -H "Authorization: Bearer $TOKEN" https://backend/api/dashboard
```

### Error Handling
- [ ] 404 for non-existent routes
- [ ] 401 for missing auth token
- [ ] 403 for insufficient permissions
- [ ] 500 errors logged but not exposed
- [ ] No stack traces in production

---

## PHASE 12: POST-DEPLOYMENT FOLLOW-UP

### First 24 Hours
- [ ] Monitor error logs
- [ ] Watch for database issues
- [ ] Check API response times
- [ ] Monitor authentication issues
- [ ] Verify backups are working

### First Week
- [ ] Review all error logs
- [ ] Check database performance
- [ ] Verify all features working
- [ ] Test employee onboarding
- [ ] Test role-based access

### Ongoing
- [ ] Monitor Railway dashboard
- [ ] Set up automated backups
- [ ] Set up monitoring/alerting
- [ ] Plan regular security updates
- [ ] Document any issues found

---

## ❌ STOP IF ANY OF THESE ARE NOT DONE

- ❌ Code not committed to git
- ❌ Secrets still hardcoded
- ❌ Environment variables not documented
- ❌ Database migrations not tested
- ❌ Build fails locally
- ❌ Authentication not working
- ❌ Procfiles missing or wrong
- ❌ .env in git repository
- ❌ No post-deployment testing plan
- ❌ JWT_SECRET not generated

---

## 📞 EMERGENCY CONTACTS

**In case of deployment issues:**

1. Check Railway logs: `railway logs`
2. Check health endpoint: `https://backend/api/health`
3. Check database connection: `railway connect postgres`
4. Review `RAILWAY_DEPLOYMENT_GUIDE.md` troubleshooting
5. Check `RAILWAY_CONFIG_CHANGES.md` for configuration issues

---

## ✅ FINAL SIGN-OFF

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Developer | | | |
| QA/Tester | | | |
| Project Lead | | | |
| System Admin | | | |

---

**Deployment Status:** `[ ] READY TO DEPLOY` | `[ ] NOT READY`

**Issues Found:** None / List below
```
1. ___________________
2. ___________________
3. ___________________
```

**Notes:**
```
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
```

---

**Version:** 1.0.0  
**Last Updated:** September 19, 2026  
**Total Checks:** 80+  
**Estimated Time:** 1 hour complete

---

## 🎉 YOU'RE READY TO DEPLOY!

Once ALL items are checked and signed off, proceed with confidence.

Good luck! 🚀
