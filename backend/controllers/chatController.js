const ChatMessage = require('../models/ChatMessage');

exports.createChatMessage = async (req, res, next) => {
  try {
    const { sessionId, message } = req.body;

    if (!sessionId || !message || String(message).trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Please enter a chat message.' });
    }

    if (!req.user?._id) {
      return res.status(401).json({ success: false, message: 'Please login before sending a message.' });
    }

    const sender = req.user.role === 'Admin' ? 'Admin' : 'User';

    if (sender === 'Admin') {
      const sessionExists = await ChatMessage.exists({ sessionId });
      if (!sessionExists) {
        return res.status(404).json({ success: false, message: 'Chat session not found.' });
      }
    } else {
      const existingUserMessage = await ChatMessage.findOne({ sessionId, sender: 'User' }).select('user');
      if (existingUserMessage && String(existingUserMessage.user) !== String(req.user._id)) {
        return res.status(403).json({ success: false, message: 'You can only send messages to your own chat thread.' });
      }
    }

    const chatMessage = await ChatMessage.create({
      user: req.user._id,
      sessionId,
      name: req.user.name,
      email: req.user.email,
      message: String(message).trim(),
      sender,
      status: sender === 'Admin' ? 'Read' : 'New'
    });

    res.status(201).json({ success: true, chatMessage });
  } catch (err) {
    next(err);
  }
};

exports.getChatMessages = async (req, res, next) => {
  try {
    const messages = await ChatMessage.find().populate('user', 'name email').sort({ createdAt: -1 });
    res.json({ success: true, messages });
  } catch (err) {
    next(err);
  }
};

exports.getSessionMessages = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'Session ID is required.' });
    }

    const messages = await ChatMessage.find({ sessionId }).populate('user', 'name email role').sort({ createdAt: 1 });

    if (req.user.role !== 'Admin') {
      const ownsSession = messages.some((item) => String(item.user?._id || item.user) === String(req.user._id));
      if (messages.length > 0 && !ownsSession) {
        return res.status(403).json({ success: false, message: 'You can only view your own chat thread.' });
      }
    }

    res.json({ success: true, messages });
  } catch (err) {
    next(err);
  }
};
