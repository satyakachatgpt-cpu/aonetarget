import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || crypto.randomBytes(64).toString('hex');
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

export function generateTokens(student) {
  const payload = {
    studentId: student.id || student._id?.toString(),
    phone: student.phone,
    name: student.name
  };

  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
  const refreshToken = jwt.sign({ ...payload, type: 'refresh' }, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });

  return { accessToken, refreshToken };
}

export function verifyAccessToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, JWT_REFRESH_SECRET);
}

export function generateDeviceId() {
  return crypto.randomBytes(16).toString('hex');
}

export function generateSignedUrl(filePath, expiresInSeconds = 3600) {
  const expiry = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const data = `${filePath}:${expiry}`;
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(data).digest('hex');
  return { signature, expiry };
}

export function verifySignedUrl(filePath, signature, expiry) {
  if (Math.floor(Date.now() / 1000) > parseInt(expiry)) return false;
  const data = `${filePath}:${expiry}`;
  const expected = crypto.createHmac('sha256', JWT_SECRET).update(data).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export function authMiddleware(req, res, next) {
  try {
    let token = null;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    if (!token && req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token && req.cookies?.sessionToken) {
      req._legacySession = true;
      return next();
    }

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function optionalAuth(req, res, next) {
  try {
    let token = null;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    if (!token && req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (token) {
      req.user = verifyAccessToken(token);
    }
  } catch (e) {
  }
  next();
}

export { JWT_SECRET, JWT_REFRESH_SECRET };
