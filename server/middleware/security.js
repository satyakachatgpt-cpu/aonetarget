import rateLimit from 'express-rate-limit';

// Public Rate Limiter (for student registration/check)
export const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 requests per windowMs
  message: { error: 'Too many requests from this IP, please try again after 15 minutes' }
});


// Auth Rate Limiter
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: { error: 'Too many verify requests from this IP, please try again after 15 minutes' }
});

// Security Headers
export const securityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
};

// Input Sanitization (Placeholder)
export const sanitizeInput = (req, res, next) => {
  // Add actual sanitization logic if needed
  next();
};
