const express = require('express');
const router = express.Router();
const paymentsController = require('../controllers/paymentsController');
const authenticate = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const paymentIdValidator = [
  body('orderId').isMongoId(),
  body('paymentIntentId').optional({ checkFalsy: true }).isString().trim().isLength({ max: 200 }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    next();
  }
];

const checkoutValidator = [
  body('items').isArray({ min: 1, max: 50 }),
  body('items.*.product').optional({ checkFalsy: true }).isMongoId(),
  body('items.*.quantity').optional().isInt({ min: 1, max: 999 }),
  body('items.*.price').optional().isFloat({ gt: 0, max: 10000000 }),
  body('items.*.title').optional({ checkFalsy: true }).isString().trim().isLength({ max: 160 }),
  body('guestDetails.email').optional({ checkFalsy: true }).isEmail().normalizeEmail(),
  body('guestDetails.phone').optional({ checkFalsy: true }).isString().trim().isLength({ max: 40 }),
  body('guestDetails.address').optional({ checkFalsy: true }).isString().trim().isLength({ max: 400 }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    next();
  }
];

const optionalAuthenticate = async (req, res, next) => {
  const hasToken = req.headers.authorization?.startsWith('Bearer ') || req.cookies?.token;
  if (!hasToken) return next();
  return authenticate(req, res, next);
};

router.post('/create-checkout-session', optionalAuthenticate, checkoutValidator, paymentsController.createCheckoutSession);
router.post('/create-payment-intent', authenticate, paymentIdValidator, paymentsController.createPaymentIntent);
router.post('/confirm-payment', authenticate, paymentIdValidator, paymentsController.confirmPayment);

module.exports = router;
