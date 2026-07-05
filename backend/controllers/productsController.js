const Product = require('../models/Product');
const generateProductCode = require('../utils/generateProductCode');
const uploadToCloudinary = require('../utils/uploadToCloudinary');

const productFields = [
  'title',
  'shortDescription',
  'description',
  'price',
  'stockQuantity',
  'status',
  'category',
  'itemType'
];

const buildProductData = async (req) => {
  const productData = {};
  productFields.forEach((field) => {
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

exports.createProduct = async (req, res, next) => {
  try {
    const productData = await buildProductData(req);
    productData.productCode = await generateProductCode(Product);
    const product = await Product.create(productData);
    res.status(201).json({ success: true, product });
  } catch (err) { next(err); }
};

exports.updateProduct = async (req, res, next) => {
  try {
    const updateData = await buildProductData(req);
    const product = await Product.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.json({ success: true, product });
  } catch (err) { next(err); }
};

exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
};

exports.getProducts = async (req, res, next) => {
  try {
    const filter = {};
    if (['main_product', 'accessory'].includes(req.query.itemType)) {
      filter.itemType = req.query.itemType;
    }

    const products = await Product.find(filter);
    res.json(products.map((product) => ({
      ...product.toObject(),
      image: product.imageUrl
    })));
  } catch (err) { next(err); }
};

exports.getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json(product);
  } catch (err) { next(err); }
};

exports.updateStockStatus = async (req, res, next) => {
  try {
    const { status, stockQuantity } = req.body;
    if (!['In Stock', 'Out of Stock'].includes(status) || !Number.isInteger(Number(stockQuantity)) || Number(stockQuantity) < 0) {
      return res.status(400).json({ success: false, message: 'Invalid stock status or quantity' });
    }
    const product = await Product.findByIdAndUpdate(req.params.id, { status, stockQuantity }, { new: true });
    
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.json({ success: true, product });
  } catch (err) { next(err); }
};
