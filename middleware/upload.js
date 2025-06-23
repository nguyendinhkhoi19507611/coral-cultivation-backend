const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../utils/cloudinary');
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'coral-cultivation',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [
      { width: 1200, height: 800, crop: 'limit' },
      { quality: 'auto' },
      { fetch_format: 'auto' }
    ]
  }
});
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, 
    files: 10 
  }
});
const uploadSingle = upload.single('image');
const uploadMultiple = upload.array('images', 10);
const uploadFields = upload.fields([
  { name: 'images', maxCount: 10 },
  { name: 'avatar', maxCount: 1 },
  { name: 'logo', maxCount: 1 },
  { name: 'businessLicense', maxCount: 1 }
]);
const uploadImages = (req, res, next) => {
  uploadMultiple(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          message: 'File too large. Maximum size is 5MB per file.'
        });
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          message: 'Too many files. Maximum is 10 files.'
        });
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
          message: 'Unexpected field name for file upload.'
        });
      }
    } else if (err) {
      return res.status(400).json({
        message: err.message || 'File upload error'
      });
    }
    next();
  });
};
const uploadSingleImage = (req, res, next) => {
  uploadSingle(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          message: 'File too large. Maximum size is 5MB.'
        });
      }
    } else if (err) {
      return res.status(400).json({
        message: err.message || 'File upload error'
      });
    }
    next();
  });
};
const uploadProfile = (req, res, next) => {
  uploadFields(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          message: 'File too large. Maximum size is 5MB per file.'
        });
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          message: 'Too many files uploaded.'
        });
      }
    } else if (err) {
      return res.status(400).json({
        message: err.message || 'File upload error'
      });
    }
    next();
  });
};
const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Error deleting image:', error);
    throw error;
  }
};
const extractPublicId = (url) => {
  const parts = url.split('/');
  const filename = parts[parts.length - 1];
  return filename.split('.')[0];
};
const resizeImage = async (publicId, width, height) => {
  try {
    const result = await cloudinary.uploader.explicit(publicId, {
      type: 'upload',
      eager: [
        { width, height, crop: 'fill' }
      ]
    });
    return result.eager[0].secure_url;
  } catch (error) {
    console.error('Error resizing image:', error);
    throw error;
  }
};

module.exports = {
  uploadImages,
  uploadSingleImage,
  uploadProfile,
  deleteImage,
  extractPublicId,
  resizeImage
};