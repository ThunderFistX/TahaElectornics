const User = require('../models/User');

exports.getCurrentUser = async (req, res, next) => {
  try {
    res.json({ success: true, user: req.user });
  } catch (error) {
    next(error);
  }
};

exports.getUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-password -googleId');
    res.json({ success: true, users });
  } catch (error) {
    next(error);
  }
};

exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password -googleId');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (req.user.role !== 'Admin' && req.user._id.toString() !== user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

exports.updateUser = async (req, res, next) => {
  try {
    const updates = {};
    if (req.body.name !== undefined) {
      updates.name = String(req.body.name || '').trim().slice(0, 120);
    }

    if (req.body.phone !== undefined) {
      updates.phone = String(req.body.phone || '').trim().slice(0, 40);
    }

    if (req.body.deliveryAddress !== undefined) {
      updates.deliveryAddress = {
        address: String(req.body.deliveryAddress?.address || '').trim().slice(0, 400),
        postalCode: String(req.body.deliveryAddress?.postalCode || '').trim().slice(0, 30)
      };
    }

    if (req.user.role !== 'Admin' && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    Object.assign(user, updates);
    await user.save();

    res.json({ success: true, user: user.toObject({ transform: (doc, ret) => { delete ret.password; delete ret.googleId; return ret; } }) });
  } catch (error) {
    next(error);
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    if (req.user.role !== 'Admin' && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, message: 'User deleted' });
  } catch (error) {
    next(error);
  }
};
