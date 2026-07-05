const Order = require('../models/Order');
const CartItem = require('../models/CartItem');
const Tracking = require('../models/Tracking');
const Product = require('../models/Product');
const Payment = require('../models/Payment');
const User = require('../models/User');
const generateTrackingId = require('../utils/generateTrackingId');

const allowedOrderStatuses = ['Pending', 'Confirmed', 'Cancelled'];
const allowedRefundStatuses = ['Approved', 'Rejected', 'Refunded'];
const allowedChangeStatuses = ['Approved', 'Rejected'];
const cancelWindowMs = 24 * 60 * 60 * 1000;

const createUniqueTrackingId = async () => {
  let trackingId = generateTrackingId();
  while (await Tracking.exists({ trackingId })) {
    trackingId = generateTrackingId();
  }
  return trackingId;
};

const cleanDeliveryDetails = (source = {}) => ({
  phone: String(source.phone || '').trim(),
  address: String(source.address || '').trim(),
  postalCode: String(source.postalCode || '').trim()
});

const hasDeliveryDetails = (details) => (
  Boolean(details.phone && details.address && details.postalCode)
);

exports.placeOrder = async (req, res, next) => {
  try {
    const userId = req.user && req.user._id;
    let items = [];
    let total = 0;
    let deliveryDetails = cleanDeliveryDetails(req.body.deliveryDetails);

    if (userId) {
      const savedDeliveryDetails = cleanDeliveryDetails({
        phone: req.user.phone,
        address: req.user.deliveryAddress?.address,
        postalCode: req.user.deliveryAddress?.postalCode
      });

      if (!hasDeliveryDetails(deliveryDetails)) {
        deliveryDetails = savedDeliveryDetails;
      }

      if (!hasDeliveryDetails(deliveryDetails)) {
        return res.status(400).json({
          success: false,
          code: 'DELIVERY_DETAILS_REQUIRED',
          message: 'Please add your delivery address, phone number, and postal code before placing an order.'
        });
      }
    } else {
      deliveryDetails = cleanDeliveryDetails(req.body.guestDetails);
      if (!hasDeliveryDetails(deliveryDetails)) {
        return res.status(400).json({
          success: false,
          code: 'DELIVERY_DETAILS_REQUIRED',
          message: 'Please provide delivery address, phone number, and postal code.'
        });
      }
    }

    if (req.body.items && Array.isArray(req.body.items) && req.body.items.length) {
      for (const it of req.body.items) {
        let product = null;
        if (it.product && /^[0-9a-fA-F]{24}$/.test(String(it.product))) {
          product = await Product.findById(it.product);
        }

        const qty = Number(it.quantity) || 1;
        if (product) {
          if (product.stockQuantity < qty) {
             return res.status(400).json({ success: false, message: `Product ${product.title || 'Unknown'} is out of stock` });
          }
          await Product.findByIdAndUpdate(product._id, { $inc: { stockQuantity: -qty } });
        }

        const price = product ? product.price : Number(it.price) || 0;

        total += price * qty;
        items.push({
          product: product?._id,
          quantity: qty,
          price,
          title: product?.title || it.title || 'Custom Project',
          description: product?.description || it.description || ''
        });
      }
    } else if (userId) {
      const cartItems = await CartItem.find({ user: userId }).populate('product');
      if (!cartItems.length) {
        return res.status(400).json({ success: false, message: 'Cart is empty' });
      }

      for (const ci of cartItems) {
        if (!ci.product || ci.product.stockQuantity < ci.quantity) {
          return res.status(400).json({ success: false, message: `Product ${ci.product?.title || 'Unknown'} is out of stock` });
        }

        const price = ci.product.price;
        // Decrement stock atomically
        await Product.findByIdAndUpdate(ci.product._id, { $inc: { stockQuantity: -ci.quantity } });
        
        total += price * ci.quantity;
        items.push({
          product: ci.product._id,
          quantity: ci.quantity,
          price,
          title: ci.product.title,
          description: ci.product.description
        });
      }
    } else {
      return res.status(400).json({ success: false, message: 'No items to place order' });
    }

    const paymentInfo = req.body.paymentInfo || { method: 'cash_on_delivery', details: {} };
    const paymentMethod = paymentInfo.method || paymentInfo.provider || 'cash_on_delivery';
    const isCashOnDelivery = paymentMethod === 'cash_on_delivery';
    const trackingId = await createUniqueTrackingId();

    const orderData = {
      items,
      totalAmount: total,
      paymentStatus: isCashOnDelivery ? 'Pending' : 'Paid',
      orderStatus: 'Pending',
      paymentInfo: {
        provider: paymentMethod,
        details: paymentInfo.details || {}
      },
      deliveryDetails,
      trackingId // Include it here so we only write to the DB once
    };

    if (userId) orderData.user = userId;
    if (req.body.guestDetails) {
      orderData.guestDetails = {
        ...req.body.guestDetails,
        ...deliveryDetails
      };
    }

    const order = await Order.create(orderData);
    if (userId) {
      await User.findByIdAndUpdate(userId, {
        phone: deliveryDetails.phone,
        deliveryAddress: {
          address: deliveryDetails.address,
          postalCode: deliveryDetails.postalCode
        }
      });
    }
    await Tracking.create({ order: order._id, trackingId, status: 'Pending' });
    await Payment.create({
      order: order._id,
      provider: paymentMethod,
      providerPaymentId: paymentInfo.details?.paymentIntentId || paymentInfo.details?.transactionId || `${paymentMethod}-${order._id}`,
      amount: order.totalAmount,
      currency: paymentInfo.details?.currency || 'pkr',
      status: isCashOnDelivery ? 'pending' : 'paid',
      raw: paymentInfo
    });

    if (userId && (!req.body.items || !req.body.items.length)) {
      await CartItem.deleteMany({ user: userId });
    }

    res.status(201).json({ success: true, order, trackingId });
  } catch (err) {
    next(err);
  }
};

exports.getUserOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user._id }).populate('items.product');
    res.json({ success: true, orders });
  } catch (err) {
    next(err);
  }
};

exports.getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate('items.product').populate('user');
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    if (req.user && order.user && order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    res.json({ success: true, order });
  } catch (err) {
    next(err);
  }
};

exports.getAllOrders = async (req, res, next) => {
  try {
    const orders = await Order.find().populate('user').populate('items.product');
    res.json({ success: true, orders });
  } catch (err) {
    next(err);
  }
};

exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!allowedOrderStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid order status' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (status === 'Confirmed' && order.paymentStatus !== 'Paid' && order.paymentInfo?.provider !== 'cash_on_delivery') {
      return res.status(400).json({ success: false, message: 'Only paid orders can be confirmed' });
    }

    if (order.orderStatus !== 'Cancelled' && status === 'Cancelled') {
      for (const item of order.items) {
        if (item.product) {
          await Product.findByIdAndUpdate(item.product, { $inc: { stockQuantity: item.quantity } });
        }
      }
    }

    order.orderStatus = status;
    await order.save();

    if (order.trackingId) {
      await Tracking.findOneAndUpdate({ trackingId: order.trackingId }, { status }, { new: true });
    }
    res.json({ success: true, order });
  } catch (err) {
    next(err);
  }
};

exports.cancelOrder = async (req, res, next) => {
  try {
    const { account, reason } = req.body || {};
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    if (req.user.role !== 'Admin' && (!order.user || order.user.toString() !== req.user._id.toString())) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    if (req.user.role !== 'Admin' && order.orderStatus === 'Confirmed') {
      return res.status(400).json({ success: false, message: 'Confirmed orders cannot be cancelled. Please request a product change instead.' });
    }

    if (order.orderStatus !== 'Cancelled') {
      for (const item of order.items) {
        if (item.product) {
          await Product.findByIdAndUpdate(item.product, { $inc: { stockQuantity: item.quantity } });
        }
      }
    }

    order.orderStatus = 'Cancelled';
    if (order.paymentStatus === 'Paid') {
      const ageMs = Date.now() - new Date(order.createdAt).getTime();
      if (ageMs <= cancelWindowMs) {
        order.paymentStatus = 'Refund Requested';
        order.refundRequest = {
          requested: true,
          requestedAt: new Date(),
          account: account || '',
          reason: reason || 'Cancelled within allowed time',
          status: 'Requested'
        };
      }
    }
    await order.save();
    if (order.trackingId) {
      await Tracking.findOneAndUpdate({ trackingId: order.trackingId }, { status: 'Cancelled' });
    }
    res.json({ success: true, order });
  } catch (err) {
    next(err);
  }
};

exports.requestProductChange = async (req, res, next) => {
  try {
    const { details } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    if (!order.user || order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    if (order.orderStatus !== 'Confirmed') {
      return res.status(400).json({ success: false, message: 'Product changes can only be requested after admin confirms the order' });
    }
    if (!details || !String(details).trim()) {
      return res.status(400).json({ success: false, message: 'Please describe the product change you want' });
    }

    order.changeRequest = {
      requested: true,
      requestedAt: new Date(),
      details: String(details).trim(),
      status: 'Requested'
    };
    await order.save();
    res.json({ success: true, order });
  } catch (err) {
    next(err);
  }
};

exports.updateChangeRequest = async (req, res, next) => {
  try {
    const { status, adminNote } = req.body;
    if (!allowedChangeStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid change request status' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    if (!order.changeRequest?.requested) {
      return res.status(400).json({ success: false, message: 'This order has no product change request' });
    }

    order.changeRequest.status = status;
    order.changeRequest.adminNote = adminNote || '';
    order.changeRequest.resolvedAt = new Date();
    await order.save();
    res.json({ success: true, order });
  } catch (err) {
    next(err);
  }
};

exports.updateRefundStatus = async (req, res, next) => {
  try {
    const { status, adminNote } = req.body;
    if (!allowedRefundStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid refund status' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (!order.refundRequest?.requested) {
      return res.status(400).json({ success: false, message: 'This order has no refund request' });
    }

    order.refundRequest.status = status;
    order.refundRequest.resolvedAt = new Date();
    order.refundRequest.adminNote = adminNote || '';
    if (status === 'Refunded') {
      order.paymentStatus = 'Refunded';
    }

    await order.save();
    res.json({ success: true, order });
  } catch (err) {
    next(err);
  }
};
