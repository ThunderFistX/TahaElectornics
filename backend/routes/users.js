const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authenticate = require('../middleware/auth');
const permit = require('../middleware/role');
const validateObjectIdParam = require('../middleware/validateObjectId');

router.get('/me', authenticate, userController.getCurrentUser);
router.get('/', authenticate, permit('Admin'), userController.getUsers);
router.get('/:id', validateObjectIdParam('id'), authenticate, userController.getUser);
router.patch('/:id', validateObjectIdParam('id'), authenticate, userController.updateUser);
router.delete('/:id', validateObjectIdParam('id'), authenticate, userController.deleteUser);

module.exports = router;
