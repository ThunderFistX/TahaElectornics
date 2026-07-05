const ContactMessage = require('../models/ContactMessage');

exports.createContactMessage = async (req, res, next) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    if (!name || !email || !message || String(message).trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your name, email, and a message of at least 10 characters.'
      });
    }

    const contactMessage = await ContactMessage.create({
      user: req.user?._id,
      name,
      email,
      phone,
      subject,
      message
    });

    res.status(201).json({ success: true, message: 'Message sent successfully', contactMessage });
  } catch (err) {
    next(err);
  }
};

exports.getContactMessages = async (req, res, next) => {
  try {
    const messages = await ContactMessage.find()
      .populate('user', 'name email')
      .populate('adminReply.repliedBy', 'name email')
      .sort({ createdAt: -1 });
    res.json({ success: true, messages });
  } catch (err) {
    next(err);
  }
};

exports.getMyContactMessages = async (req, res, next) => {
  try {
    const messages = await ContactMessage.find({ user: req.user._id })
      .populate('adminReply.repliedBy', 'name email')
      .sort({ createdAt: -1 });
    res.json({ success: true, messages });
  } catch (err) {
    next(err);
  }
};

exports.updateContactStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['New', 'Read', 'Replied', 'Resolved'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const contactMessage = await ContactMessage.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    ).populate('user', 'name email').populate('adminReply.repliedBy', 'name email');

    if (!contactMessage) {
      return res.status(404).json({ success: false, message: 'Contact message not found' });
    }

    res.json({ success: true, contactMessage });
  } catch (err) {
    next(err);
  }
};

exports.replyToContactMessage = async (req, res, next) => {
  try {
    const reply = String(req.body.reply || '').trim();
    if (reply.length < 2) {
      return res.status(400).json({ success: false, message: 'Please enter a reply.' });
    }

    const contactMessage = await ContactMessage.findById(req.params.id);
    if (!contactMessage) {
      return res.status(404).json({ success: false, message: 'Contact message not found' });
    }

    contactMessage.adminReply = {
      message: reply,
      repliedBy: req.user._id,
      repliedAt: new Date()
    };
    contactMessage.status = 'Replied';
    await contactMessage.save();
    await contactMessage.populate('user', 'name email');
    await contactMessage.populate('adminReply.repliedBy', 'name email');

    res.json({ success: true, contactMessage });
  } catch (err) {
    next(err);
  }
};
