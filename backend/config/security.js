const crypto = require('crypto');

const devJwtSecret = crypto.randomBytes(48).toString('hex');
const devSessionSecret = crypto.randomBytes(48).toString('hex');
let warnedJwtFallback = false;
let warnedSessionFallback = false;

const isProduction = () => process.env.NODE_ENV === 'production';

const requireSecret = (name, fallback, warnedFlagSetter) => {
  const value = String(process.env[name] || '').trim();
  if (value && !/^your[_-]/i.test(value)) return value;

  if (isProduction()) {
    throw new Error(`${name} must be set to a strong secret in production.`);
  }

  warnedFlagSetter();
  return fallback;
};

const getJwtSecret = () => requireSecret('JWT_SECRET', devJwtSecret, () => {
  if (!warnedJwtFallback) {
    warnedJwtFallback = true;
    console.warn('JWT_SECRET is not set; using an ephemeral development secret.');
  }
});

const getSessionSecret = () => requireSecret('SESSION_SECRET', devSessionSecret, () => {
  if (!warnedSessionFallback) {
    warnedSessionFallback = true;
    console.warn('SESSION_SECRET is not set; using an ephemeral development secret.');
  }
});

const parseAllowedOrigins = () => {
  const configured = String(process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (!isProduction()) {
    configured.push('http://localhost:3000', 'http://localhost:5000', 'http://localhost:5001');
  }

  return [...new Set(configured)];
};

module.exports = {
  getJwtSecret,
  getSessionSecret,
  parseAllowedOrigins,
  isProduction
};
