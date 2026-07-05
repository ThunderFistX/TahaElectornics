const express = require('express');

const router = express.Router();
const cartController = require('../controllers/cartController');
const authenticate = require('../middleware/auth');
const { cartValidator, cartQuantityValidator } = require('../middleware/validate');
const validateObjectIdParam = require('../middleware/validateObjectId');

router.use(authenticate);
router.get('/', cartController.getCart);
router.post('/', cartValidator, cartController.addToCart);
router.put('/:id', validateObjectIdParam('id'), cartQuantityValidator, cartController.updateCartItem);
router.delete('/:id', validateObjectIdParam('id'), cartController.removeCartItem);

module.exports = router;
