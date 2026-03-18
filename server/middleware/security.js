import rateLimit from 'express-rate-limit';

export const globalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' }
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many authentication attempts, please try again later' }
});

export const videoLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
  message: { error: 'Too many video requests' }
});

export function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
  }

  next();
}

export function sanitizeInput(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    sanitizeObj(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    sanitizeObj(req.query);
  }
  next();
}

function sanitizeObj(obj) {
  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === 'string') {
      obj[key] = obj[key].replace(/[\$]/g, '').replace(/\.\./g, '');
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitizeObj(obj[key]);
    }
  }
}
