const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authenticate = require('../middleware/auth');
const permit = require('../middleware/role');
const { productValidator } = require('../middleware/validate');
const upload = require('../middleware/upload');
const validateObjectIdParam = require('../middleware/validateObjectId');

router.get('/orders', authenticate, permit('Admin'), adminController.getOrders);
router.get('/orders/pending', authenticate, permit('Admin'), adminController.getPendingOrders);
router.patch('/orders/:id/status', validateObjectIdParam('id'), authenticate, permit('Admin'), adminController.updateOrderStatus);
router.get('/products', authenticate, permit('Admin'), adminController.getProducts);
router.post('/products', authenticate, permit('Admin'), upload.single('image'), productValidator, adminController.createProduct);
router.patch('/products/:id', validateObjectIdParam('id'), authenticate, permit('Admin'), upload.single('image'), productValidator, adminController.updateProduct);
router.delete('/products/:id', validateObjectIdParam('id'), authenticate, permit('Admin'), adminController.deleteProduct);
router.get('/summary', authenticate, permit('Admin'), adminController.getSummary);
router.post('/assign-admin', authenticate, permit('Admin'), adminController.assignAdmin);

module.exports = router;
