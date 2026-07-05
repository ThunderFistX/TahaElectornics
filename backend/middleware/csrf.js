const crypto = require('crypto');

const CSRF_COOKIE = 'csrfToken';
const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const createToken = () => crypto.randomBytes(32).toString('hex');

const cookieOptions = {
  httpOnly: false,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/'
};

const issueCsrfToken = (req, res) => {
  const token = createToken();
  res.cookie(CSRF_COOKIE, token, cookieOptions);
  res.json({ success: true, csrfToken: token });
};

const csrfProtection = (req, res, next) => {
  if (!UNSAFE_METHODS.has(req.method)) return next();

  const usesBearerToken = req.headers.authorization?.startsWith('Bearer ');
  const usesCookieToken = Boolean(req.cookies?.token);
  if (!usesCookieToken || usesBearerToken) return next();

  const cookieToken = req.cookies[CSRF_COOKIE];
  const headerToken = req.get('x-csrf-token');
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ success: false, message: 'Invalid CSRF token' });
  }

  next();
};

module.exports = {
  issueCsrfToken,
  csrfProtection
};
