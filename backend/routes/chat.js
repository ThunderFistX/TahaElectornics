const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const authenticate = require('../middleware/auth');
const permit = require('../middleware/role');
const { chatValidator } = require('../middleware/validate');

router.post('/', authenticate, chatValidator, chatController.createChatMessage);
router.get('/session/:sessionId', authenticate, chatController.getSessionMessages);
router.get('/', authenticate, permit('Admin'), chatController.getChatMessages);

module.exports = router;
