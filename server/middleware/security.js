import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';

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

// 🛡️ Phase 1: Brute Force Protection
// Generic auth failure message to prevent account enumeration
export const GENERIC_AUTH_ERROR = 'Invalid credentials';

/**
 * Brute Force Gate Middleware
 * Blocks requests if the (Identifier + IP) or (IP) has too many failed attempts.
 */
export const bruteForceGate = (identifierField = 'phone') => async (req, res, next) => {
  try {
    const db = mongoose.connection.db;
    const ip = req.ip || req.connection.remoteAddress;
    const identifier = (req.body[identifierField] || '').toString().toLowerCase().trim();

    if (!identifier) return next(); // Let the route handle missing identifier

    const now = new Date();

    // Check for lock on (Identifier + IP) or (IP alone for admin/global protection)
    const lock = await db.collection('auth_attempts').findOne({
      $or: [
        { identifier, ip },
        { ip, identifier: { $exists: false } } // Pure IP lock if needed
      ],
      lockUntil: { $gt: now }
    });

    if (lock) {
      const waitTime = Math.ceil((lock.lockUntil - now) / 60000);
      return res.status(429).json({
        error: `Account temporarily locked. Please try again in ${waitTime} minutes.`,
        code: 'ACCOUNT_LOCKED'
      });
    }

    next();
  } catch (error) {
    console.error('Brute force gate error:', error);
    next(); // Fallback to allow login if DB fails (preventing self-DOS)
  }
};

/**
 * Record Login Attempt Helper
 */
export const recordAttempt = async (identifier, ip, wasSuccessful) => {
  try {
    const db = mongoose.connection.db;
    const normalizedIdentifier = (identifier || '').toString().toLowerCase().trim();

    if (wasSuccessful) {
      // Clear attempts on success
      await db.collection('auth_attempts').deleteMany({
        $or: [
          { identifier: normalizedIdentifier, ip },
          { ip, identifier: { $exists: false } }
        ]
      });
      return;
    }

    // Increment attempts
    const filter = { identifier: normalizedIdentifier, ip };
    const update = {
      $inc: { attempts: 1 },
      $set: { lastAttempt: new Date() }
    };

    const result = await db.collection('auth_attempts').findOneAndUpdate(
      filter,
      update,
      { upsert: true, returnDocument: 'after' }
    );

    const attemptDoc = result.value || result; // findOneAndUpdate return difference across node-mongodb-native versions

    // Lock after 5 attempts for 15 minutes
    if (attemptDoc && attemptDoc.attempts >= 5) {
      await db.collection('auth_attempts').updateOne(
        { _id: attemptDoc._id },
        { $set: { lockUntil: new Date(Date.now() + 15 * 60 * 1000) } }
      );
      console.warn(`[SECURITY] Account locked for ${normalizedIdentifier} from IP ${ip} after 5 failures.`);
    }
  } catch (error) {
    console.error('Record attempt error:', error);
  }
};

// Security Headers
export const securityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
};

// 🛡️ Safe Input Sanitization
// Strips potentially dangerous script tags from string fields without breaking rich text/HTML
export const sanitizeInput = (req, res, next) => {
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key]
          .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "")
          .replace(/on\w+="[^"]*"/gim, "")
          .replace(/on\w+='[^']*'/gim, "")
          .replace(/javascript:[^"']*/gim, "");
      }
    });
  }
  next();
};
