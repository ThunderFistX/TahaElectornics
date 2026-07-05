const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  productCode: {
    type: String,
    required: true,
    unique: true,
    sparse: true,
    uppercase: true,
    trim: true,
    match: [
      /^[A-Z]{2,3}-\d{2,3}$/,
      'Product ID must use letters and numbers like EDE-32 or HO-678'
    ]
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  shortDescription: {
    type: String,
    required: true,
    trim: true,
    maxlength: 180
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  stockQuantity: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['In Stock', 'Out of Stock'],
    default: 'In Stock'
  },
  category: {
    type: String,
    required: true,
    trim: true,
    maxlength: 80
  },
  itemType: {
    type: String,
    enum: ['main_product', 'accessory'],
    default: 'main_product',
    index: true
  },
  imageUrl: {
    type: String,
    trim: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Product', ProductSchema);
