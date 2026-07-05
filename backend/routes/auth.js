const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcryptjs = require('bcryptjs');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const ContactMessage = require('../models/ContactMessage');
const authenticate = require('../middleware/auth');
const { getJwtSecret } = require('../config/security');
const {
  sendPasswordReset,
  sendAdminOtp,
  notifySecurityEvent
} = require('../utils/recoveryNotifications');

const router = express.Router();

const LOCKOUT_WINDOWS_MS = [15 * 60 * 1000, 30 * 60 * 1000, 60 * 60 * 1000];
const RESET_TOKEN_MS = 60 * 60 * 1000;
const OTP_TOKEN_MS = 10 * 60 * 1000;
const RECOVERY_WINDOW_MS = 60 * 60 * 1000;
const RECOVERY_MAX_PER_WINDOW = 3;
const GENERIC_LOGIN_FAILURE = 'Invalid email or password';
const GENERIC_RESET_MESSAGE = "If that email exists, we've sent a reset link.";

const generateToken = (user) => jwt.sign(
  { id: user._id, role: user.role, email: user.email },
  getJwtSecret(),
  { expiresIn: user.forcePasswordReset ? '10m' : '30m' }
);

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();
const normalizeName = (name) => String(name || '').trim().slice(0, 120);
const normalizePhone = (phone) => String(phone || '').trim().slice(0, 40);
const hashValue = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');
const isPasswordStrong = (password) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{10,}$/.test(password);

const isEnvAdminEmail = (email) => (
  process.env.ADMIN_EMAIL &&
  email &&
  normalizeEmail(email) === normalizeEmail(process.env.ADMIN_EMAIL)
);

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone || '',
  deliveryAddress: user.deliveryAddress || {},
  forcePasswordReset: Boolean(user.forcePasswordReset)
});

const getClientIp = (req) => (
  req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown'
);

const logAudit = async (req, user, action, details = {}) => {
  try {
    await AuditLog.create({
      action,
      user: user?._id,
      email: normalizeEmail(user?.email || req.body?.email || req.query?.email),
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
      details
    });
  } catch (error) {
    console.error('Audit log failed', error.message || error);
  }
};

const getLockoutDurationMs = (user) => {
  const count = Math.max(0, Number(user?.lockoutCount || 0));
  return LOCKOUT_WINDOWS_MS[Math.min(count, LOCKOUT_WINDOWS_MS.length - 1)];
};

const registerFailedLogin = async (req, user) => {
  if (!user) {
    await logAudit(req, null, 'login_failed', { reason: 'invalid_credentials' });
    return;
  }

  user.loginAttempts = (user.loginAttempts || 0) + 1;
  user.failedLoginHistory = [
    ...(user.failedLoginHistory || []),
    { ipAddress: getClientIp(req), attemptedAt: new Date() }
  ].slice(-50);

  const details = {
    reason: 'invalid_credentials',
    attempts: user.loginAttempts
  };

  if (user.loginAttempts >= 5) {
    const lockMs = getLockoutDurationMs(user);
    user.lockUntil = new Date(Date.now() + lockMs);
    user.lockoutCount = (user.lockoutCount || 0) + 1;
    user.loginAttempts = 0;
    details.lockUntil = user.lockUntil;
    details.lockMinutes = Math.round(lockMs / 60000);
  }

  await user.save();
  await logAudit(req, user, details.lockUntil ? 'account_locked' : 'login_failed', details);
};

const clearLoginLock = async (user) => {
  user.loginAttempts = 0;
  user.lockUntil = undefined;
  await user.save();
};

const canRequestRecovery = async (req, user, type) => {
  if (!user) return false;
  const cutoff = Date.now() - RECOVERY_WINDOW_MS;
  const ip = getClientIp(req);
  const recent = (user.recoveryRequests || []).filter((item) => (
    item.type === type &&
    item.requestedAt &&
    item.requestedAt.getTime() > cutoff &&
    (!item.ipAddress || item.ipAddress === ip)
  ));

  if (recent.length >= RECOVERY_MAX_PER_WINDOW) {
    await logAudit(req, user, 'recovery_rate_limited', { type });
    return false;
  }

  user.recoveryRequests = [
    ...(user.recoveryRequests || []).filter((item) => item.requestedAt && item.requestedAt.getTime() > cutoff),
    { type, ipAddress: ip, requestedAt: new Date() }
  ].slice(-50);
  return true;
};

const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
const googleCallbackURL = process.env.GOOGLE_CALLBACK_URL || `http://localhost:${process.env.PORT || 5000}/auth/google/callback`;
const isGoogleOAuthConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

if (isGoogleOAuthConfigured) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: googleCallbackURL,
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile?.emails?.[0]?.value;
      if (!email) return done(new Error('Google account must provide an email'), null);

      let user = await User.findOne({ email: normalizeEmail(email) });
      if (!user) {
        user = await User.create({
          googleId: profile.id,
          name: profile.displayName || email,
          email,
          avatar: profile?.photos?.[0]?.value,
          role: isEnvAdminEmail(email) ? 'Admin' : 'User'
        });
      } else if (!user.googleId) {
        user.googleId = profile.id;
        await user.save();
      }

      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }));

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    const user = await User.findById(id);
    done(null, user);
  });

  router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
  router.get('/google/callback', passport.authenticate('google', { session: false, failureRedirect: '/auth/failure' }), (req, res) => {
    const token = generateToken(req.user);
    const params = new URLSearchParams({ token, role: req.user.role });
    res.redirect(`${frontendUrl}/auth/success#${params.toString()}`);
  });
} else {
  router.get('/google', (req, res) => {
    res.status(503).json({
      success: false,
      message: 'Google sign-in is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in backend/.env.'
    });
  });

  router.get('/google/callback', (req, res) => {
    res.redirect(`${frontendUrl}/auth/failure?reason=google_oauth_not_configured`);
  });
}

router.post('/signup', async (req, res) => {
  try {
    const name = normalizeName(req.body.name);
    const phone = normalizePhone(req.body.phone);
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || '').trim();

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields' });
    }
    if (!isPasswordStrong(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 10 characters and include uppercase, lowercase, number, and symbol.'
      });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const user = new User({ name, email, password, phone, role: isEnvAdminEmail(email) ? 'Admin' : 'User' });
    await user.save();

    const token = generateToken(user);
    res.status(201).json({ success: true, message: 'User registered successfully', token, user: publicUser(user) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || '').trim();
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email });

    if (user?.lockUntil && user.lockUntil > new Date()) {
      await logAudit(req, user, 'login_blocked_locked', { lockUntil: user.lockUntil });
      return res.status(429).json({
        success: false,
        message: 'This account is temporarily locked. Please try again later.',
        locked: true,
        lockUntil: user.lockUntil,
        recoveryAvailable: user.role === 'Admin'
      });
    }

    const passwordMatchesStored = user ? await user.comparePassword(password) : false;
    if (!user || !passwordMatchesStored) {
      await registerFailedLogin(req, user);
      return res.status(401).json({ success: false, message: GENERIC_LOGIN_FAILURE });
    }

    await clearLoginLock(user);
    await logAudit(req, user, 'login_success');
    const token = generateToken(user);
    res.json({ success: true, message: 'Login successful', token, user: publicUser(user) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    if (!email) {
      return res.status(400).json({ success: false, message: 'Please provide your email address' });
    }

    const user = await User.findOne({ email });
    if (user && await canRequestRecovery(req, user, 'password_reset')) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      user.passwordResetToken = hashValue(rawToken);
      user.passwordResetExpires = new Date(Date.now() + RESET_TOKEN_MS);
      user.passwordResetRequestedAt = new Date();
      await user.save();
      await sendPasswordReset(user, rawToken);
      await logAudit(req, user, 'password_reset_requested', { expiresAt: user.passwordResetExpires });
    } else {
      await logAudit(req, null, 'password_reset_requested_unknown');
    }

    res.json({ success: true, message: GENERIC_RESET_MESSAGE });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/reset-password/:token', async (req, res) => {
  try {
    const password = String(req.body.password || '').trim();
    if (!isPasswordStrong(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 10 characters and include uppercase, lowercase, number, and symbol.'
      });
    }

    const tokenHash = hashValue(req.params.token);
    const user = await User.findOne({
      passwordResetToken: tokenHash,
      passwordResetExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Reset link is invalid or expired.' });
    }

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.passwordResetRequestedAt = undefined;
    user.forcePasswordReset = false;
    user.lastPasswordChangedAt = new Date();
    await user.save();
    await logAudit(req, user, 'password_changed', { method: 'reset_link' });
    await notifySecurityEvent(user, 'Your password was changed', 'Your account password was changed. Contact support immediately if this was not you.', { type: 'password_changed' });

    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/admin-recovery/request-otp', async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const user = await User.findOne({ email, role: 'Admin' });

    if (user?.lockUntil && user.lockUntil > new Date() && await canRequestRecovery(req, user, 'admin_otp')) {
      const code = crypto.randomInt(100000, 1000000).toString();
      user.adminOtpHash = await bcryptjs.hash(code, 10);
      user.adminOtpExpires = new Date(Date.now() + OTP_TOKEN_MS);
      user.adminOtpUsedAt = undefined;
      user.adminOtpRequestedAt = new Date();
      await user.save();
      await sendAdminOtp(user, code);
      await logAudit(req, user, 'admin_otp_sent', { expiresAt: user.adminOtpExpires });
    }

    res.json({ success: true, message: 'If recovery is available, a verification code has been sent to the contact information on file.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/admin-recovery/verify', async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const code = String(req.body.code || '').trim();
    const user = await User.findOne({ email, role: 'Admin' });

    if (!user || !code) {
      return res.status(401).json({ success: false, message: 'Verification failed.' });
    }

    let verified = false;
    let method = 'otp';
    if (user.adminOtpHash && user.adminOtpExpires > new Date() && !user.adminOtpUsedAt) {
      verified = await bcryptjs.compare(code, user.adminOtpHash);
    }

    if (!verified && Array.isArray(user.backupRecoveryCodes)) {
      for (const backup of user.backupRecoveryCodes) {
        if (!backup.usedAt && backup.codeHash && await bcryptjs.compare(code, backup.codeHash)) {
          backup.usedAt = new Date();
          verified = true;
          method = 'backup_code';
          break;
        }
      }
    }

    if (!verified) {
      await logAudit(req, user, 'admin_recovery_failed', { method: 'otp_or_backup_code' });
      return res.status(401).json({ success: false, message: 'Verification failed.' });
    }

    user.adminOtpUsedAt = new Date();
    user.adminOtpHash = undefined;
    user.adminOtpExpires = undefined;
    user.lockUntil = undefined;
    user.loginAttempts = 0;
    user.forcePasswordReset = true;
    await user.save();
    await logAudit(req, user, 'admin_recovery_verified', { method });
    await notifySecurityEvent(user, 'Admin recovery was used', 'A secondary recovery method was used to access your admin account. Reset your password now if this was you.', { type: 'admin_recovery', method });

    const token = generateToken(user);
    res.json({ success: true, message: 'Identity verified. Please reset your password now.', token, user: publicUser(user) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/admin-recovery/backup-codes', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Admin access required.' });
    }

    const rawCodes = Array.from({ length: 10 }, () => crypto.randomBytes(5).toString('hex').toUpperCase());
    req.user.backupRecoveryCodes = await Promise.all(rawCodes.map(async (code) => ({
      codeHash: await bcryptjs.hash(code, 10)
    })));
    await req.user.save();
    await logAudit(req, req.user, 'backup_recovery_codes_generated');
    res.json({ success: true, codes: rawCodes, message: 'Store these backup codes now. They will not be shown again.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/change-password', authenticate, async (req, res) => {
  try {
    const password = String(req.body.password || '').trim();
    if (!isPasswordStrong(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 10 characters and include uppercase, lowercase, number, and symbol.'
      });
    }

    req.user.password = password;
    req.user.forcePasswordReset = false;
    req.user.lastPasswordChangedAt = new Date();
    await req.user.save();
    await logAudit(req, req.user, 'password_changed', { method: 'authenticated' });
    await notifySecurityEvent(req.user, 'Your password was changed', 'Your account password was changed. Contact support immediately if this was not you.', { type: 'password_changed' });

    const token = generateToken(req.user);
    res.json({ success: true, message: 'Password updated successfully.', token, user: publicUser(req.user) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/support-request', async (req, res) => {
  try {
    const name = normalizeName(req.body.name);
    const email = normalizeEmail(req.body.email);
    const message = String(req.body.message || '').trim().slice(0, 2000);

    if (!name || !email || message.length < 10) {
      return res.status(400).json({ success: false, message: 'Please provide your name, email, and a message of at least 10 characters.' });
    }

    const contactMessage = await ContactMessage.create({
      name,
      email,
      subject: 'Account recovery support request',
      message: `Account recovery request:\n\n${message}`
    });
    await logAudit(req, null, 'support_request_submitted', { contactMessage: contactMessage._id });
    res.status(201).json({ success: true, message: 'Your support request was submitted. Our team will manually verify identity before changing account access.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/me', authenticate, (req, res) => {
  res.json({ success: true, user: publicUser(req.user) });
});

router.get('/failure', (req, res) => res.status(401).json({ message: 'Authentication failed' }));

module.exports = router;
