const multer = require('multer');
const path = require('path');

const fileFilter = (req, file, cb) => {
  const allowedMimes = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
  const allowedExtensions = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);
  const extension = path.extname(file.originalname || '').toLowerCase();

  if (allowedMimes.has(file.mimetype) && allowedExtensions.has(extension)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPG, PNG, GIF, and WebP images are allowed.'), false);
  }
};

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

module.exports = upload;
