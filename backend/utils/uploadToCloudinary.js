const path = require('path');
const { v2: cloudinary } = require('cloudinary');
const sharp = require('sharp');

cloudinary.config({
  cloud_name: String(process.env.CLOUDINARY_CLOUD_NAME || '').trim(),
  api_key: String(process.env.CLOUDINARY_API_KEY || '').trim(),
  api_secret: String(process.env.CLOUDINARY_API_SECRET || '').trim()
});

const makePublicId = (file) => {
  const extension = path.extname(file.originalname || '');
  const basename = path.basename(file.originalname || 'product', extension).replace(/[^a-z0-9]/gi, '-').toLowerCase();
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
  return `product-${basename}-${uniqueSuffix}`;
};

const validateAndNormalizeImage = async (file) => {
  const metadata = await sharp(file.buffer, { failOn: 'warning' }).metadata();
  const allowedFormats = new Set(['jpeg', 'png', 'webp', 'gif']);
  if (!allowedFormats.has(metadata.format)) {
    throw new Error('Invalid image content.');
  }
  if ((metadata.width || 0) > 6000 || (metadata.height || 0) > 6000) {
    throw new Error('Image dimensions are too large.');
  }

  if (metadata.format === 'gif') return file.buffer;

  return sharp(file.buffer, { failOn: 'warning' })
    .rotate()
    .resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true })
    .toFormat(metadata.format, { quality: 86 })
    .toBuffer();
};

const uploadToCloudinary = async (file) => {
  if (!file) return undefined;

  const requiredEnv = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
  const missing = requiredEnv.filter((key) => !String(process.env[key] || '').trim());
  if (missing.length) {
    throw new Error(`Missing Cloudinary config: ${missing.join(', ')}`);
  }

  const imageBuffer = await validateAndNormalizeImage(file);

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: process.env.CLOUDINARY_FOLDER || 'projectff/products',
        public_id: makePublicId(file),
        resource_type: 'image'
      },
      (error, result) => {
        if (error) return reject(error);
        if (!result?.secure_url) return reject(new Error('Cloudinary upload did not return secure_url'));
        resolve(result.secure_url);
      }
    );

    stream.end(imageBuffer);
  });
};

module.exports = uploadToCloudinary;
