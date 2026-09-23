import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createProxyMiddleware } from 'http-proxy-middleware';

/*
 * Serves the built site and forwards /api to the backend service.
 *
 * The app addresses the API as a same-origin path: api.js falls back to "/api",
 * and roughly thirty fetch() calls hardcode "/api/..." outright. Pointing those
 * at a second domain would mean editing every call site, so instead this server
 * owns /api and relays it.
 *
 * Without the relay, a static file server answers /api/auth/login with its SPA
 * fallback — index.html, status 200. axios parses the HTML, finds no token, and
 * the sign-in silently does nothing: no failed request, no console error.
 *
 * Because the browser only ever talks to this origin, CORS never enters into it.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

const PORT = process.env.PORT || 3000;
const BACKEND_URL = process.env.BACKEND_URL;

if (!BACKEND_URL) {
  console.error('❌ BACKEND_URL is not set. Every /api request would fall through');
  console.error('   to the SPA and return HTML, which fails silently in the browser.');
  console.error('   Set it to the backend service, e.g. http://backend.railway.internal:8080');
  process.exit(1);
}

const apiProxy = createProxyMiddleware({
  target: BACKEND_URL,
  changeOrigin: true,
  xfwd: true,
  proxyTimeout: 30000,
  timeout: 30000,
  onError(err, req, res) {
    console.error(`❌ Proxy error for ${req.method} ${req.originalUrl}: ${err.message}`);
    if (res && !res.headersSent) {
      res.status(502).json({ error: 'Cannot reach the API. Please try again shortly.' });
    }
  },
});

// Mounted at the root rather than on '/api': Express strips a mount path from
// req.url, and whether the proxy restores it differs between versions. Matching
// here keeps the full "/api/..." path the backend expects.
app.use((req, res, next) => {
  if (req.url === '/api' || req.url.startsWith('/api/')) {
    return apiProxy(req, res, next);
  }
  return next();
});

app.use(express.static(path.join(__dirname, 'dist')));

// Client-side routes such as /login are resolved by the app, not the filesystem.
// This sits after the proxy so it can never swallow an API call.
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Frontend listening on ${PORT}`);
  console.log(`   /api → ${BACKEND_URL}`);
});
