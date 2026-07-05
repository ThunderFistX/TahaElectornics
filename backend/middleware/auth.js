const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { getJwtSecret } = require('../config/security');

const authenticate = async (req, res, next) => {
  try {
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token && req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const decoded = jwt.verify(token, getJwtSecret());
    const userId = decoded.id || decoded.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    req.user = user;
    if (
      user.forcePasswordReset &&
      !['/api/auth/change-password', '/auth/change-password', '/api/auth/me', '/auth/me'].includes(req.originalUrl)
    ) {
      return res.status(403).json({
        success: false,
        message: 'Password reset required before continuing.',
        forcePasswordReset: true
      });
    }
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Token is not valid' });
  }
};

module.exports = authenticate;
