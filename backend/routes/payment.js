const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || '');
const Order = require('../models/Order');
const authenticate = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const paymentValidator = [
  body('orderId').isMongoId(),
  body('paymentIntentId').optional({ checkFalsy: true }).isString().trim().isLength({ max: 200 }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    next();
  }
];

// Create payment intent
router.post('/create-intent', authenticate, paymentValidator, async (req, res) => {
  try {
    const { orderId } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Check if user owns this order
    if (!order.user || (order.user.toString() !== req.user._id.toString() && req.user.role !== 'Admin')) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(order.totalAmount * 100), // Amount in cents
      currency: 'pkr',
      metadata: {
        orderId: order._id.toString()
      }
    });

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Payment intent creation failed' });
  }
});

// Confirm payment
router.post('/confirm-payment', authenticate, paymentValidator, async (req, res) => {
  try {
    const { orderId, paymentIntentId } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    if (!order.user || (order.user.toString() !== req.user._id.toString() && req.user.role !== 'Admin')) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // Update order with payment info
    order.stripePaymentId = paymentIntentId;
    order.paymentStatus = 'completed';
    await order.save();

    res.json({
      success: true,
      message: 'Payment confirmed',
      order
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Payment confirmation failed' });
  }
});

module.exports = router;
