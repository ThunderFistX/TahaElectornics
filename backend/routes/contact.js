const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const authenticate = require('../middleware/auth');
const permit = require('../middleware/role');
const { contactValidator } = require('../middleware/validate');
const validateObjectIdParam = require('../middleware/validateObjectId');

const optionalAuthenticate = (req, res, next) => {
  const hasToken = req.headers.authorization?.startsWith('Bearer ') || req.cookies?.token;
  if (!hasToken) return next();
  return authenticate(req, res, next);
};

router.post('/', optionalAuthenticate, contactValidator, contactController.createContactMessage);
router.get('/me', authenticate, contactController.getMyContactMessages);
router.get('/', authenticate, permit('Admin'), contactController.getContactMessages);
router.patch('/:id/status', validateObjectIdParam('id'), authenticate, permit('Admin'), contactController.updateContactStatus);
router.post('/:id/reply', validateObjectIdParam('id'), authenticate, permit('Admin'), contactController.replyToContactMessage);

module.exports = router;
