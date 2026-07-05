const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  guestDetails: {
    name: String,
    email: String,
    phone: String,
    address: String,
    postalCode: String
  },
  deliveryDetails: {
    phone: String,
    address: String,
    postalCode: String
  },
  items: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
      },
      title: String,
      description: String,
      quantity: {
        type: Number,
        default: 1,
        min: 1
      },
      price: {
        type: Number,
        required: true,
        min: 0
      }
    }
  ],
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Paid', 'Failed', 'Refund Requested', 'Refunded'],
    default: 'Pending'
  },
  orderStatus: {
    type: String,
    enum: ['Pending', 'Confirmed', 'Cancelled'],
    default: 'Pending'
  },
  trackingId: {
    type: String,
    trim: true,
    unique: true,
    sparse: true
  },
  paymentInfo: {
    provider: String,
    details: mongoose.Schema.Types.Mixed
  },
  refundRequest: {
    requested: { type: Boolean, default: false },
    requestedAt: Date,
    account: String,
    reason: String,
    status: {
      type: String,
      enum: ['None', 'Requested', 'Approved', 'Rejected', 'Refunded'],
      default: 'None'
    },
    resolvedAt: Date,
    adminNote: String
  },
  changeRequest: {
    requested: { type: Boolean, default: false },
    requestedAt: Date,
    details: String,
    status: {
      type: String,
      enum: ['None', 'Requested', 'Approved', 'Rejected'],
      default: 'None'
    },
    resolvedAt: Date,
    adminNote: String
  }
}, { timestamps: true });

module.exports = mongoose.model('Order', OrderSchema);
