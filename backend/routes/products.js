const express = require('express');
const router = express.Router();
const productsController = require('../controllers/productsController');
const authenticate = require('../middleware/auth');
const permit = require('../middleware/role');
const { productValidator } = require('../middleware/validate');
const upload = require('../middleware/upload');
const validateObjectIdParam = require('../middleware/validateObjectId');

// Public product listing
router.get('/', productsController.getProducts);
router.get('/:id', validateObjectIdParam('id'), productsController.getProductById);

// Admin product management - with image upload
router.post('/', authenticate, permit('Admin'), upload.single('image'), productValidator, productsController.createProduct);
router.put('/:id', validateObjectIdParam('id'), authenticate, permit('Admin'), upload.single('image'), productValidator, productsController.updateProduct);
router.delete('/:id', validateObjectIdParam('id'), authenticate, permit('Admin'), productsController.deleteProduct);
router.patch('/:id/stock', validateObjectIdParam('id'), authenticate, permit('Admin'), productsController.updateStockStatus);

module.exports = router;
