const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const authenticate = require('../middleware/auth');
const { getJwtSecret, isProduction } = require('../config/security');

const router = express.Router();

const generateToken = (user) => jwt.sign(
  { id: user._id, role: user.role, email: user.email }, 
  getJwtSecret(), 
  { expiresIn: '30m' }
);

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();
const normalizeName = (name) => String(name || '').trim().slice(0, 120);
const normalizePhone = (phone) => String(phone || '').trim().slice(0, 40);

const isEnvAdminEmail = (email) => (
  process.env.ADMIN_EMAIL &&
  email &&
  normalizeEmail(email) === normalizeEmail(process.env.ADMIN_EMAIL)
);

const isEnvAdminPassword = (password) => (
  process.env.ADMIN_PASSWORD &&
  String(password || '').trim() === String(process.env.ADMIN_PASSWORD).trim()
);

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone || '',
  deliveryAddress: user.deliveryAddress || {}
});

const LOCK_TIME_MS = 4 * 60 * 60 * 1000;

const getMaxAttempts = (user) => (user?.lockoutCount > 0 ? 2 : 3);

const registerFailedLogin = async (user) => {
  if (!user) return;
  user.loginAttempts = (user.loginAttempts || 0) + 1;
  const maxAttempts = getMaxAttempts(user);
  if (user.loginAttempts >= maxAttempts) {
    user.lockUntil = new Date(Date.now() + LOCK_TIME_MS);
    user.lockoutCount = (user.lockoutCount || 0) + 1;
    user.loginAttempts = 0;
  }
  await user.save();
};

const clearLoginLock = async (user) => {
  user.loginAttempts = 0;
  user.lockUntil = undefined;
  await user.save();
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
      if (!email) {
        return done(new Error('Google account must provide an email'), null);
      }

      let user = await User.findOne({ email });
      if (!user) {
        const role = (process.env.ADMIN_EMAIL && email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase()) ? 'Admin' : 'User';
        user = await User.create({
          googleId: profile.id,
          name: profile.displayName || email,
          email,
          avatar: profile?.photos?.[0]?.value,
          role
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
    const redirectUrl = `${frontendUrl}/auth/success#${params.toString()}`;
    res.redirect(redirectUrl);
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
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const isAdminSignup = isEnvAdminEmail(email);
    if (isAdminSignup && process.env.ADMIN_PASSWORD && !isEnvAdminPassword(password)) {
      return res.status(403).json({ success: false, message: 'Admin password does not match ADMIN_PASSWORD' });
    }

    const role = isAdminSignup ? 'Admin' : 'User';
    const user = new User({ name, email, password, phone, role });
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

    const isAdminLogin = isEnvAdminEmail(email) && isEnvAdminPassword(password);
    let user = await User.findOne({ email });

    if (!user && isAdminLogin) {
      user = await User.create({
        name: 'Admin',
        email,
        password,
        role: 'Admin'
      });
    }

    if (user?.lockUntil && user.lockUntil > new Date()) {
      return res.status(429).json({
        success: false,
        message: 'Too many failed login attempts. Please try again in 4 hours.'
      });
    }

    const passwordMatchesStored = user ? await user.comparePassword(password) : false;
    if (!user || !(passwordMatchesStored || isAdminLogin)) {
      await registerFailedLogin(user);
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (isAdminLogin && user.role !== 'Admin') {
      user.role = 'Admin';
      await user.save();
    }

    if (isAdminLogin && !passwordMatchesStored) {
      user.password = password;
      await user.save();
    }

    await clearLoginLock(user);
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
    if (user) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      user.passwordResetToken = crypto.createHash('sha256').update(rawToken).digest('hex');
      user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
      await user.save();
      if (!isProduction()) {
        console.log(`Password reset token for ${email}: ${rawToken}`);
      }
    }

    res.json({
      success: true,
      message: 'If an account exists for that email, a password reset request has been created.'
    });
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
