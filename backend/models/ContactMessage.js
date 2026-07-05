const mongoose = require('mongoose');

const ContactMessageSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    trim: true
  },
  subject: {
    type: String,
    trim: true,
    default: 'General enquiry'
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['New', 'Read', 'Replied', 'Resolved'],
    default: 'New'
  },
  adminReply: {
    message: {
      type: String,
      trim: true
    },
    repliedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    repliedAt: Date
  }
}, { timestamps: true });

module.exports = mongoose.model('ContactMessage', ContactMessageSchema);
