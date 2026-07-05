const Tracking = require('../models/Tracking');
const Order = require('../models/Order');

exports.getByTrackingId = async (req, res, next) => {
  try {
    const track = await Tracking.findOne({ trackingId: req.params.trackingId }).populate('order');
    if (!track) return res.status(404).json({ message: 'Not found' });
    res.json(track);
  } catch (err) { next(err); }
};

exports.updateTrackingStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const track = await Tracking.findOneAndUpdate({ trackingId: req.params.trackingId }, { status }, { new: true });
    
    if (!track) return res.status(404).json({ message: 'Tracking record not found' });

    if (req.body.updateOrder && track.order) {
      await Order.findByIdAndUpdate(track.order, { orderStatus: status });
    }
    res.json(track);
  } catch (err) { next(err); }
};
