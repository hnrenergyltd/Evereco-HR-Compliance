/*
 * Unhandled errors are logged in full server-side but never returned verbatim:
 * `err.message` on a database or filesystem failure carries SQL fragments and
 * absolute paths, which is reconnaissance material for an attacker.
 *
 * Only errors explicitly marked safe (`err.expose`, as set by http-errors and
 * by our own validation paths) are passed through to the client.
 */
export default function errorHandler(err, req, res, next) {
  console.error('Error:', {
    method: req.method,
    path: req.originalUrl,
    userId: req.user?.id ?? null,
    message: err.message,
    stack: err.stack,
  });

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token' });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Session expired. Please sign in again.' });
  }

  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'Origin not allowed' });
  }

  // Oversized or malformed JSON bodies.
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body too large' });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Malformed JSON body' });
  }

  const status = err.status || err.statusCode || 500;

  if (status < 500 && err.expose) {
    return res.status(status).json({ error: err.message });
  }

  res.status(status).json({
    error: status < 500 ? 'Request could not be processed' : 'Internal server error',
  });
}
