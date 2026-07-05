const { body, validationResult } = require('express-validator');

const checkValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

exports.productValidator = [
  body('productCode').optional().isString().trim().matches(/^[A-Za-z]{2,3}-\d{2,3}$/),
  body('title').isString().trim().isLength({ min: 1, max: 160 }),
  body('shortDescription').isString().trim().isLength({ min: 1, max: 180 }),
  body('description').isString().trim().isLength({ min: 1, max: 5000 }),
  body('category').isString().trim().isLength({ min: 1, max: 80 }),
  body('itemType').optional().isIn(['main_product', 'accessory']),
  body('price').isFloat({ gt: 0 }),
  body('stockQuantity').optional().isInt({ min: 0 }),
  body('status').optional().isIn(['In Stock', 'Out of Stock']),
  body('imageUrl').optional({ checkFalsy: true }).isURL({ protocols: ['https'], require_protocol: true }),
  body('image').optional({ checkFalsy: true }).isURL({ protocols: ['https'], require_protocol: true }),
  checkValidation
];

exports.cartValidator = [
  body('productId').isMongoId(),
  body('quantity').optional().isInt({ min: 1 }),
  checkValidation
];

exports.cartQuantityValidator = [
  body('quantity').isInt({ min: 1, max: 999 }),
  checkValidation
];

exports.orderValidator = [
  body('paymentInfo').optional().isObject(),
  body('deliveryDetails.phone').optional().isString().trim().isLength({ max: 40 }),
  body('deliveryDetails.address').optional().isString().trim().isLength({ max: 400 }),
  body('deliveryDetails.postalCode').optional().isString().trim().isLength({ max: 30 }),
  body('guestDetails.phone').optional().isString().trim().isLength({ max: 40 }),
  body('guestDetails.address').optional().isString().trim().isLength({ max: 400 }),
  body('guestDetails.postalCode').optional().isString().trim().isLength({ max: 30 }),
  body('items').optional().isArray({ max: 50 }),
  body('items.*.product').optional().isMongoId(),
  body('items.*.quantity').optional().isInt({ min: 1, max: 999 }),
  checkValidation
];

exports.contactValidator = [
  body('name').isString().trim().isLength({ min: 1, max: 120 }),
  body('email').isEmail().normalizeEmail(),
  body('phone').optional({ checkFalsy: true }).isString().trim().isLength({ max: 40 }),
  body('subject').optional({ checkFalsy: true }).isString().trim().isLength({ max: 160 }),
  body('message').isString().trim().isLength({ min: 10, max: 5000 }),
  checkValidation
];

exports.chatValidator = [
  body('sessionId').isString().trim().matches(/^[A-Za-z0-9._:-]{8,120}$/),
  body('message').isString().trim().isLength({ min: 2, max: 2000 }),
  checkValidation
];
