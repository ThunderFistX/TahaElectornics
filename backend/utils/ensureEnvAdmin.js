const User = require('../models/User');

const ensureEnvAdmin = async () => {
  const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = String(process.env.ADMIN_PASSWORD || '').trim();

  if (!email || !password) return;

  let user = await User.findOne({ email });
  if (!user) {
    user = new User({
      name: 'Admin',
      email,
      password,
      role: 'Admin'
    });
    await user.save();
    console.log(`Admin user created from ADMIN_EMAIL: ${email}`);
    return;
  }

  let changed = false;
  if (user.role !== 'Admin') {
    user.role = 'Admin';
    changed = true;
  }

  const passwordMatches = await user.comparePassword(password);
  if (!passwordMatches) {
    user.password = password;
    changed = true;
  }

  if (changed) {
    await user.save();
    console.log(`Admin user synced from ADMIN_EMAIL: ${email}`);
  }
};

module.exports = ensureEnvAdmin;
