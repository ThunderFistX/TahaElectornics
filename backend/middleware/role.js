const permit = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      message: `Forbidden: ${req.user.email || 'current user'} has role ${req.user.role || 'Unknown'}, required ${roles.join(' or ')}`
    });
  }
  next();
};

module.exports = permit;
