const { isProduction } = require('../config/security');

const appUrl = () => process.env.FRONTEND_URL || 'http://localhost:5173';

const postWebhook = async (payload) => {
  const webhookUrl = process.env.RECOVERY_EMAIL_WEBHOOK_URL;
  if (!webhookUrl || typeof fetch !== 'function') return false;

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return response.ok;
};

const sendRecoveryEmail = async ({ to, subject, text, metadata = {} }) => {
  if (!to) return false;

  try {
    const sent = await postWebhook({ to, subject, text, metadata });
    if (sent) return true;
  } catch (error) {
    console.error('Recovery email webhook failed', error.message || error);
  }

  if (!isProduction()) {
    console.log(`[recovery-email] To: ${to}\nSubject: ${subject}\n${text}`);
  }
  return false;
};

const sendPasswordReset = async (user, rawToken) => sendRecoveryEmail({
  to: user.email,
  subject: 'Reset your password',
  text: `Use this link within 1 hour to reset your password: ${appUrl()}/reset-password/${rawToken}`,
  metadata: { userId: String(user._id), type: 'password_reset' }
});

const sendAdminOtp = async (user, code) => sendRecoveryEmail({
  to: user.email,
  subject: 'Your admin recovery code',
  text: `Your admin identity verification code is ${code}. It expires in 10 minutes.`,
  metadata: { userId: String(user._id), type: 'admin_otp' }
});

const notifySecurityEvent = async (user, subject, text, metadata = {}) => sendRecoveryEmail({
  to: user.email,
  subject,
  text,
  metadata: { userId: String(user._id), ...metadata }
});

module.exports = {
  sendPasswordReset,
  sendAdminOtp,
  notifySecurityEvent
};
