import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import 'express-async-errors';
import dotenv from 'dotenv';
import { initializeDatabase } from './config/database.js';
import authRoutes from './routes/auth.js';
import employeeRoutes from './routes/employees.js';
import dashboardRoutes from './routes/dashboard.js';
import adminRoutes from './routes/admin.js';
import errorHandler from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { protect, requirePasswordChange } from './middleware/auth.js';
import { initializeEmailService } from './utils/mailer.js';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

/*
 * Refuse to boot in production without a real signing key. A deployment that
 * silently runs on the committed placeholder would issue tokens anyone holding
 * the repository could forge, so this fails loudly instead.
 */
const PLACEHOLDER_SECRET = 'your_jwt_secret_key_change_this_in_production';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET === PLACEHOLDER_SECRET) {
  const message =
    'JWT_SECRET is missing or still set to the placeholder value. ' +
    'Set a long random value in the environment before starting.';
  if (isProduction) {
    console.error(`❌ ${message}`);
    process.exit(1);
  }
  console.warn(`⚠️  ${message} (allowed in development only)`);
}

const app = express();

// Behind Railway's proxy the client IP arrives in X-Forwarded-For; without
// this the rate limiters would see the proxy IP and bucket every user together.
if (isProduction) {
  app.set('trust proxy', 1);
}

// Security headers: nosniff, frame denial, HSTS, referrer policy, and friends.
// This API serves only JSON, so it never needs to be framed.
app.use(
  helmet({
    frameguard: { action: 'deny' },
    crossOriginResourcePolicy: { policy: 'same-site' },
  })
);

/*
 * Allow only the configured front-end origins. The previous `cors()` call
 * defaulted to `*`, which let any site on the internet call this API with a
 * user's token.
 */
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Same-origin and non-browser callers (curl, health checks) send no Origin.
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

// Bound the JSON body so a large payload cannot exhaust memory.
app.use(express.json({ limit: '1mb' }));

app.use('/api', apiLimiter);

// Initialize database
await initializeDatabase();

// Initialize email service
await initializeEmailService();

// Routes. The auth router is mounted before the password-change gate so that
// signing out and setting a new password stay reachable while the flag is set.
app.use('/api/auth', authRoutes);

app.use('/api/employees', protect, requirePasswordChange, employeeRoutes);
app.use('/api/dashboard', protect, requirePasswordChange, dashboardRoutes);
app.use('/api/admin', protect, requirePasswordChange, adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📊 API: http://localhost:${PORT}/api`);
});
