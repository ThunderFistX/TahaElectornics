const CartItem = require('../models/CartItem');
const Product = require('../models/Product');

exports.getCart = async (req, res, next) => {
  try {
    const items = await CartItem.find({ user: req.user._id }).populate('product');
    res.json({ success: true, items });
  } catch (err) {
    next(err);
  }
};

exports.addToCart = async (req, res, next) => {
  try {
    const { productId, quantity = 1 } = req.body;
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Use findOneAndUpdate with $inc for an atomic database operation
    const item = await CartItem.findOneAndUpdate(
      { user: req.user._id, product: productId },
      { $inc: { quantity: Number(quantity) } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).populate('product');

    res.status(201).json({ success: true, item });
  } catch (err) {
    next(err);
  }
};

exports.updateCartItem = async (req, res, next) => {
  try {
    const { quantity } = req.body;
    const item = await CartItem.findOne({ _id: req.params.id, user: req.user._id }).populate('product');
    if (!item) {
      return res.status(404).json({ success: false, message: 'Cart item not found' });
    }
    item.quantity = Number(quantity) || 1;
    await item.save();
    res.json({ success: true, item });
  } catch (err) {
    next(err);
  }
};

exports.removeCartItem = async (req, res, next) => {
  try {
    const item = await CartItem.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!item) {
      return res.status(404).json({ success: false, message: 'Cart item not found' });
    }
    res.json({ success: true, message: 'Removed', item });
  } catch (err) {
    next(err);
  }
};
