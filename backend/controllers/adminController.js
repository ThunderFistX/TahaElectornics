const User = require('../models/User');
const Order = require('../models/Order');
const Product = require('../models/Product');
const ContactMessage = require('../models/ContactMessage');
const ChatMessage = require('../models/ChatMessage');
const generateProductCode = require('../utils/generateProductCode');
const uploadToCloudinary = require('../utils/uploadToCloudinary');

const normalizeOrderStatus = (status) => {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'cancelled' || normalized === 'canceled') return 'Cancelled';
  if (['confirmed', 'processing', 'shipped', 'delivered', 'complete', 'completed'].includes(normalized)) return 'Confirmed';
  return 'Pending';
};

const legacyOrder = (order) => {
  const data = order.toObject ? order.toObject() : order;
  return {
    ...data,
    status: String(data.orderStatus || 'Pending').toLowerCase(),
    customerName: data.guestDetails?.name || data.user?.name || 'Customer',
    customerEmail: data.guestDetails?.email || data.user?.email || '',
  };
};

const legacyProduct = (product) => {
  const data = product.toObject ? product.toObject() : product;
  return {
    ...data,
    image: data.imageUrl,
  };
};

const buildProductData = async (req) => {
  const productData = {};
  ['title', 'shortDescription', 'description', 'price', 'stockQuantity', 'category', 'itemType'].forEach((field) => {
    if (req.body[field] !== undefined) productData[field] = req.body[field];
  });

  if (productData.stockQuantity === '') productData.stockQuantity = 0;

  const uploadedImageUrl = await uploadToCloudinary(req.file);
  if (uploadedImageUrl) {
    productData.imageUrl = uploadedImageUrl;
  } else if (req.body.imageUrl || req.body.image) {
    productData.imageUrl = req.body.imageUrl || req.body.image;
  }

  return productData;
};

exports.getOrders = async (req, res, next) => {
  try {
    const orders = await Order.find().populate('user').populate('items.product');
    res.json({ success: true, orders: orders.map(legacyOrder) });
  } catch (err) { next(err); }
};

exports.getPendingOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ orderStatus: 'Pending' }).populate('user').populate('items.product');
    res.json({ success: true, orders: orders.map(legacyOrder) });
  } catch (err) { next(err); }
};

exports.updateOrderStatus = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    order.orderStatus = normalizeOrderStatus(req.body.status);
    await order.save();
    res.json({ success: true, order: legacyOrder(order) });
  } catch (err) { next(err); }
};

exports.getProducts = async (req, res, next) => {
  try {
    const products = await Product.find();
    res.json({ success: true, products: products.map(legacyProduct) });
  } catch (err) { next(err); }
};

exports.createProduct = async (req, res, next) => {
  try {
    const productData = await buildProductData(req);
    if (productData.stockQuantity === undefined) productData.stockQuantity = 0;
    productData.productCode = await generateProductCode(Product);
    const product = await Product.create(productData);
    res.status(201).json({ success: true, product: legacyProduct(product) });
  } catch (err) { next(err); }
};

exports.updateProduct = async (req, res, next) => {
  try {
    const productData = await buildProductData(req);
    const product = await Product.findByIdAndUpdate(req.params.id, productData, { new: true, runValidators: true });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, product: legacyProduct(product) });
  } catch (err) { next(err); }
};

exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, message: 'Deleted' });
  } catch (err) { next(err); }
};

exports.getSummary = async (req, res, next) => {
  try {
    const [users, orders] = await Promise.all([
      User.countDocuments(),
      Order.find().populate('user').populate('items.product')
    ]);

    const confirmedOrders = orders.filter((order) => order.orderStatus === 'Confirmed' && (order.paymentStatus === 'Paid' || order.paymentInfo?.provider === 'cash_on_delivery'));
    const totalRevenue = confirmedOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    const [contactMessages, chatMessages] = await Promise.all([
      ContactMessage.countDocuments({ status: 'New' }),
      ChatMessage.countDocuments({ status: 'New' })
    ]);

    res.json({
      success: true,
      totalUsers: users,
      totalOrders: orders.length,
      totalRevenue,
      pendingOrders: orders.filter((order) => order.orderStatus === 'Pending').length,
      cancelledOrders: orders.filter((order) => order.orderStatus === 'Cancelled').length,
      confirmedOrders: confirmedOrders.length,
      unreadContactMessages: contactMessages,
      unreadChatMessages: chatMessages,
      orders
    });
  } catch (err) { next(err); }
};

exports.assignAdmin = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.role = 'Admin';
    await user.save();
    res.json({ message: 'Assigned admin role' });
  } catch (err) { next(err); }
};
