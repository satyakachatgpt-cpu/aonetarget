import jwt from 'jsonwebtoken';
import crypto from 'crypto';

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is required but not provided in environment variables.");
}
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
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

export function generateAdminToken(admin) {
  const payload = {
    adminId: admin.adminId || admin._id?.toString(),
    name: admin.name,
    role: 'admin',
    isAdmin: true
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: '18h' });
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
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies?.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    return res.status(401).json({
      error: 'Authentication required',
      code: 'NO_AUTH'
    });
  }

  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded;

    // Attach admin context if role is admin
    if (decoded.isAdmin || decoded.role === 'admin') {
      req.admin = {
        id: decoded.adminId,
        name: decoded.name,
        role: 'admin'
      };
    }

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Session expired. Please login again.',
        code: 'TOKEN_EXPIRED'
      });
    }
    return res.status(401).json({
      error: 'Invalid token. Please login again.',
      code: 'INVALID_TOKEN'
    });
  }
}

export function adminMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies?.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    return res.status(401).json({
      error: 'Admin authentication required',
      code: 'NO_AUTH'
    });
  }

  try {
    const decoded = verifyAccessToken(token);

    if (!decoded.isAdmin && decoded.role !== 'admin') {
      return res.status(403).json({
        error: 'Admin access required',
        code: 'FORBIDDEN'
      });
    }

    req.admin = {
      id: decoded.adminId,
      name: decoded.name,
      role: 'admin'
    };
    req.user = decoded;
    next();

  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Admin session expired. Please login again.',
        code: 'TOKEN_EXPIRED'
      });
    }
    return res.status(401).json({
      error: 'Invalid admin token.',
      code: 'INVALID_TOKEN'
    });
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

export function studentOwnerOrAdmin(req, res, next) {
  if (req.user?.isAdmin || req.user?.role === 'admin') return next();
  if (req.user?.studentId && String(req.user.studentId) === String(req.params.id)) return next();
  return res.status(403).json({ error: 'Forbidden' });
}

export { JWT_SECRET, JWT_REFRESH_SECRET };
