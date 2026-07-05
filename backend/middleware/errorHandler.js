module.exports = (err, req, res, next) => {
  console.error(`[Error] ${err.name}: ${err.message}`);

  let status = err.status || 500;
  let message = err.message || 'Server Error';

  // Handle JWT errors specifically
  if (err.name === 'JsonWebTokenError') {
    status = 401;
    message = 'Invalid token. Please log in again.';
  }
  if (err.name === 'TokenExpiredError') {
    status = 401;
    message = 'Your session has expired. Please log in again.';
  }
  if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    message = `${field} must be unique.`;
  }
  if (err.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors || {})[0]?.message || 'Invalid request data.';
  }
  if (process.env.NODE_ENV === 'production' && status === 500) {
    message = 'Server Error';
  }

  res.status(status).json({ success: false, message });
};
