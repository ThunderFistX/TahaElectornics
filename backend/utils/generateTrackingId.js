const crypto = require('crypto');

function generateTrackingId() {
  return crypto.randomBytes(6).toString('hex').toUpperCase();
}

module.exports = generateTrackingId;
