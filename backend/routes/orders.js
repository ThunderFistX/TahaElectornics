const express = require('express');
const router = express.Router();
const ordersController = require('../controllers/ordersController');
const authenticate = require('../middleware/auth');
const permit = require('../middleware/role');
const { orderValidator } = require('../middleware/validate');
const validateObjectIdParam = require('../middleware/validateObjectId');

const optionalAuthenticate = async (req, res, next) => {
  const hasToken = req.headers.authorization?.startsWith('Bearer ') || req.cookies?.token;
  if (!hasToken) return next();
  return authenticate(req, res, next);
};

router.post('/', optionalAuthenticate, orderValidator, ordersController.placeOrder);
router.get('/me', authenticate, ordersController.getUserOrders);
router.get('/:id', validateObjectIdParam('id'), authenticate, ordersController.getOrderById);
router.delete('/:id', validateObjectIdParam('id'), authenticate, ordersController.cancelOrder);
router.post('/:id/change-request', validateObjectIdParam('id'), authenticate, ordersController.requestProductChange);

router.get('/', authenticate, permit('Admin'), ordersController.getAllOrders);
router.patch('/:id/status', validateObjectIdParam('id'), authenticate, permit('Admin'), ordersController.updateOrderStatus);
router.patch('/:id/refund', validateObjectIdParam('id'), authenticate, permit('Admin'), ordersController.updateRefundStatus);
router.patch('/:id/change-request', validateObjectIdParam('id'), authenticate, permit('Admin'), ordersController.updateChangeRequest);

module.exports = router;
