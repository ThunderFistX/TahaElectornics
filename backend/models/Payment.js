const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  provider: { type: String },
  providerPaymentId: { type: String },
  amount: { type: Number },
  currency: { type: String },
  status: { type: String },
  raw: { type: Object },
}, { timestamps: true });

module.exports = mongoose.model('Payment', PaymentSchema);
