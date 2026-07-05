const express = require('express');
const dotenv = require('dotenv');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const cookieParser = require('cookie-parser');
const passport = require('passport');
const session = require('cookie-session');
const connectDB = require('./config/db');
const { getSessionSecret, parseAllowedOrigins, isProduction } = require('./config/security');
const { csrfProtection, issueCsrfToken } = require('./middleware/csrf');
const errorHandler = require('./middleware/errorHandler');
const paymentsController = require('./controllers/paymentsController');
const ensureEnvAdmin = require('./utils/ensureEnvAdmin');

dotenv.config();
const app = express();
const path = require('path');

// Connect DB early and make sure .env admin credentials can always log in.
connectDB().then(() => ensureEnvAdmin()).catch((err) => {
  console.error('Startup database task failed', err.message || err);
});

// Webhook must use raw body for stripe signature verification
app.post('/api/payment/webhook', express.raw({ type: 'application/json' }), paymentsController.webhook);

app.set('trust proxy', 1);

const allowedOrigins = parseAllowedOrigins();

// Standard middleware
app.use(express.json({ limit: '25kb' }));
app.use(express.urlencoded({ extended: false, limit: '25kb' }));
if (!isProduction()) app.use(morgan('dev'));
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", ...allowedOrigins]
    }
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  hsts: isProduction() ? undefined : false,
  referrerPolicy: { policy: 'no-referrer' }
}));
app.use(xss());
app.use(mongoSanitize());
app.use(cookieParser());
app.get('/api/csrf-token', issueCsrfToken);
app.use(csrfProtection);

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false });
app.use(limiter);
app.use('/api/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false }));
app.use('/api/auth/forgot-password', rateLimit({ windowMs: 60 * 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false }));
app.use('/api/contact', rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false }));
app.use('/api/chat', rateLimit({ windowMs: 15 * 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false }));

// Session for passport
app.use(session({
  name: 'session',
  keys: [getSessionSecret()],
  maxAge: 24 * 60 * 60 * 1000,
  httpOnly: true,
  sameSite: 'lax',
  secure: isProduction()
}));
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/tracking', require('./routes/tracking'));
app.use('/api/payment', require('./routes/payments'));
app.use('/api/users', require('./routes/users'));
app.use('/api/contact', require('./routes/contact'));
app.use('/api/chat', require('./routes/chat'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'Server is running' }));

// Serve uploads folder
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads'), {
  dotfiles: 'deny',
  fallthrough: false,
  index: false,
  setHeaders: (res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
  }
}));

// Serve the unified React app build when dld-admin is built.
const fs = require('fs');
const clientBuildPath = path.join(__dirname, '..', 'dld-admin', 'dist');
if (fs.existsSync(clientBuildPath)) {
  app.use(express.static(clientBuildPath));
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ success: false, message: 'API route not found' });
    }
    return res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
