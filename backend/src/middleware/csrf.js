const crypto = require('crypto');
const { parseToken } = require('./auth');

const config = require('../config');

const legacyTokens = new Map();

function generateCsrfToken(userId) {
  const salt = crypto.randomBytes(8).toString('hex');
  const expiresAt = Date.now() + (15 * 60 * 1000); // 15 minutes
  const data = `${userId}:${expiresAt}:${salt}`;
  const sig = crypto.createHmac('sha256', config.jwtSecret).update(data).digest('hex');
  return `${expiresAt}.${salt}.${sig}`;
}

function validateCsrfToken(userId, token) {
  if (!token || typeof token !== 'string') return false;

  if (token.includes('.')) {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const [expiresAtStr, salt, sig] = parts;
    const expiresAt = Number(expiresAtStr);
    if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false;
    if (expiresAt > Date.now() + (25 * 60 * 1000)) return false;

    const data = `${userId}:${expiresAtStr}:${salt}`;
    const expectedSig = crypto.createHmac('sha256', config.jwtSecret).update(data).digest('hex');
    try {
      const sigBuf = Buffer.from(sig, 'hex');
      const expectedBuf = Buffer.from(expectedSig, 'hex');
      if (sigBuf.length !== expectedBuf.length) return false;
      return crypto.timingSafeEqual(sigBuf, expectedBuf);
    } catch {
      return false;
    }
  }

  const key = `${userId}:${token}`;
  const expiresAt = legacyTokens.get(key);
  if (!expiresAt) return false;
  if (Date.now() > expiresAt) {
    legacyTokens.delete(key);
    return false;
  }
  return true;
}

function csrfProtection(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Exempt safe, idempotent notification read operations
  const isNotificationRead = req.path && req.path.includes('/notifications') &&
    (req.path.endsWith('/read') || req.path.endsWith('/read-all'));
  if (isNotificationRead) {
    return next();
  }

  let userId = req.user?.id;
  if (!userId) {
    const payload = parseToken(req);
    if (payload && payload !== 'invalid') {
      userId = payload.sub;
    }
  }

  if (!userId) {
    return next();
  }

  const token = req.headers['x-csrf-token'] || req.body?.csrfToken || req.body?._csrf;

  if (!token) {
    return res.status(403).json({
      error: {
        code: 'CSRF_TOKEN_MISSING',
        message: 'CSRF token diperlukan untuk permintaan ini.',
      },
    });
  }

  if (!validateCsrfToken(userId, token)) {
    return res.status(403).json({
      error: {
        code: 'CSRF_TOKEN_INVALID',
        message: 'CSRF token tidak valid atau sudah kedaluwarsa.',
      },
    });
  }

  next();
}

function csrfTokenHandler(req, res) {
  const user = req.user;
  if (!user || !user.id) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Anda harus login terlebih dahulu.',
      },
    });
  }
  
  const token = generateCsrfToken(user.id);
  res.json({ csrfToken: token });
}

function clearCsrfTokens(userId) {
  for (const [key] of legacyTokens.entries()) {
    if (key.startsWith(`${userId}:`)) {
      legacyTokens.delete(key);
    }
  }
}

module.exports = { csrfProtection, csrfTokenHandler, clearCsrfTokens, generateCsrfToken, validateCsrfToken };
