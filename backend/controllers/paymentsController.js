const Stripe = require('stripe');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const Tracking = require('../models/Tracking');
const Product = require('../models/Product');
const CartItem = require('../models/CartItem');
const generateTrackingId = require('../utils/generateTrackingId');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY || '');

const createUniqueTrackingId = async () => {
  let trackingId = generateTrackingId();
  while (await Tracking.exists({ trackingId })) {
    trackingId = generateTrackingId();
  }
  return trackingId;
};

exports.createCheckoutSession = async (req, res, next) => {
  try {
    const { guestDetails, items } = req.body;
    const userId = req.user && req.user._id;
    let total = 0;
    const validatedItems = [];
    const lineItems = [];

    // Validate catalog products against DB; custom orders can pass their quoted price.
    for (const it of (items || [])) {
      const product = it.product && /^[0-9a-fA-F]{24}$/.test(String(it.product))
        ? await Product.findById(it.product)
        : null;

      const price = product ? product.price : Number(it.price) || 0;
      if (price <= 0) continue;

      const priceInCents = Math.round(price * 100);
      const quantity = Number(it.quantity) || 1;
      total += priceInCents * quantity;

      lineItems.push({
        price_data: {
          currency: 'pkr',
          product_data: { name: product?.title || it.title || 'Custom Project' },
          unit_amount: priceInCents
        },
        quantity
      });

      validatedItems.push({
        product: product?._id,
        quantity,
        price,
        title: product?.title || it.title || 'Custom Project',
        description: product?.description || it.description || ''
      });
    }

    if (!lineItems.length) {
      return res.status(400).json({ success: false, message: 'No items for checkout' });
    }

    const order = await Order.create({
      ...(userId ? { user: userId } : {}),
      guestDetails,
      items: validatedItems,
      totalAmount: total / 100,
      paymentStatus: 'Pending',
      orderStatus: 'Pending',
      paymentInfo: { method: 'card', details: { type: 'stripe' } }
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: lineItems,
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/order-success?session_id={CHECKOUT_SESSION_ID}&orderId=${order._id}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/order-cancel`,
      metadata: { orderId: order._id.toString() }
    });

    await Payment.create({
      order: order._id,
      provider: 'stripe',
      providerPaymentId: session.id,
      amount: order.totalAmount,
      currency: 'pkr',
      status: 'pending',
      raw: session
    });

    res.json({ success: true, url: session.url, sessionId: session.id, orderId: order._id });
  } catch (err) {
    next(err);
  }
};

exports.createPaymentIntent = async (req, res, next) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    if (!order.user || (order.user.toString() !== req.user._id.toString() && req.user.role !== 'Admin')) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(order.totalAmount * 100),
      currency: 'pkr',
      metadata: { orderId: order._id.toString() }
    });

    res.json({ success: true, clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id });
  } catch (err) {
    next(err);
  }
};

exports.confirmPayment = async (req, res, next) => {
  try {
    const { orderId, paymentIntentId } = req.body;
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.user && order.user.toString() !== req.user._id.toString() && req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (order.paymentStatus !== 'Paid') {
      for (const item of order.items) {
        if (item.product) {
          const product = await Product.findById(item.product);
          if (!product || product.stockQuantity < item.quantity) {
            return res.status(400).json({ success: false, message: `${item.title || 'Project'} is out of stock` });
          }
        }
      }

      for (const item of order.items) {
        if (item.product) {
          await Product.findByIdAndUpdate(item.product, { $inc: { stockQuantity: -item.quantity } });
        }
      }

      if (!order.trackingId) {
        const trackingId = await createUniqueTrackingId();
        order.trackingId = trackingId;
        await Tracking.create({ order: order._id, trackingId, status: 'Pending' });
      }
    }

    order.paymentStatus = 'Paid';
    order.orderStatus = 'Pending';
    await order.save();

    await Payment.findOneAndUpdate(
      { order: order._id, providerPaymentId: paymentIntentId },
      {
        order: order._id,
        provider: 'stripe',
        providerPaymentId: paymentIntentId,
        amount: order.totalAmount,
        currency: 'pkr',
        status: 'paid'
      },
      { upsert: true, new: true }
    );

    if (order.user) {
      await CartItem.deleteMany({ user: order.user });
    }

    res.json({ success: true, order });
  } catch (err) {
    next(err);
  }
};

exports.webhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed.', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const orderId = session.metadata && session.metadata.orderId;
      if (orderId) {
        const order = await Order.findById(orderId);
        if (order) {
          const wasAlreadyPaid = order.paymentStatus === 'Paid';
          order.paymentStatus = 'Paid';
          order.orderStatus = 'Pending';

          if (!wasAlreadyPaid) {
            for (const item of order.items) {
              if (item.product) {
                await Product.findByIdAndUpdate(item.product, { $inc: { stockQuantity: -item.quantity } });
              }
            }
          }

          if (!order.trackingId) {
            const trackingId = await createUniqueTrackingId();
            order.trackingId = trackingId;
            await Tracking.create({ order: order._id, trackingId, status: 'Pending' });
          }

          await order.save();

          await Payment.findOneAndUpdate(
            { order: order._id, provider: 'stripe' },
            {
              order: order._id,
              provider: 'stripe',
              providerPaymentId: session.payment_intent || session.id,
              amount: (session.amount_total || 0) / 100,
              currency: session.currency || 'pkr',
              status: 'paid',
              raw: session
            },
            { upsert: true, new: true }
          );

          if (order.user) {
            await CartItem.deleteMany({ user: order.user });
          }
        }
      }
    }
    res.json({ received: true });
  } catch (err) {
    console.error('Webhook handler error', err);
    res.status(500).end();
  }
};
