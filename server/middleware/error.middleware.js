/**
 * Global Express Error Middleware - Phase 17
 * Must be registered LAST in app.js (after all routes).
 * Catches any error passed via next(err).
 */

export const errorMiddleware = (err, req, res, next) => {
  // Avoid sending headers twice
  if (res.headersSent) return next(err);

  const status = err.status || err.statusCode || 500;
  const message = err.message || 'An unexpected error occurred.';

  // Log to stderr without disrupting flow
  console.error(`[ERROR] ${req.method} ${req.path} → ${status}: ${message}`, err.stack || '');

  res.status(status).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== 'production' && err.stack ? { stack: err.stack } : {})
  });
};
