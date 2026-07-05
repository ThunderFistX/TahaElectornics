const mongoose = require('mongoose');
const bcryptjs = require("bcryptjs");

const UserSchema = new mongoose.Schema({
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    minlength: 6
  },
  phone: {
    type: String,
    trim: true
  },
  deliveryAddress: {
    address: {
      type: String,
      trim: true
    },
    postalCode: {
      type: String,
      trim: true
    }
  },
  avatar: {
    type: String
  },
  role: {
    type: String,
    enum: ['User', 'Admin'],
    default: 'User'
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date
  },
  lockoutCount: {
    type: Number,
    default: 0
  },
  passwordResetToken: {
    type: String
  },
  passwordResetExpires: {
    type: Date
  }
}, { timestamps: true });

UserSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) return next();

  try {
    const salt = await bcryptjs.genSalt(10);
    this.password = await bcryptjs.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

UserSchema.methods.comparePassword = async function(password) {
  if (!this.password) return false;
  return await bcryptjs.compare(password, this.password);
};

module.exports = mongoose.model('User', UserSchema);
