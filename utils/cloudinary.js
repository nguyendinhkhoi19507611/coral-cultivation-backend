const cloudinary = require('cloudinary').v2;

// Configure cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Test cloudinary connection
const testConnection = async () => {
  try {
    const result = await cloudinary.api.ping();
    console.log('✅ Cloudinary connected successfully:', result);
    return true;
  } catch (error) {
    console.error('❌ Cloudinary connection failed:', error);
    return false;
  }
};

// Upload base64 image
const uploadBase64 = async (base64String, options = {}) => {
  try {
    const result = await cloudinary.uploader.upload(base64String, {
      folder: 'coral-cultivation',
      ...options
    });
    return result;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
};

// Generate optimized image URL
const getOptimizedUrl = (publicId, options = {}) => {
  return cloudinary.url(publicId, {
    fetch_format: 'auto',
    quality: 'auto',
    ...options
  });
};

// Generate thumbnail
const generateThumbnail = (publicId, width = 300, height = 200) => {
  return cloudinary.url(publicId, {
    width,
    height,
    crop: 'fill',
    fetch_format: 'auto',
    quality: 'auto'
  });
};

module.exports = cloudinary;
module.exports.testConnection = testConnection;
module.exports.uploadBase64 = uploadBase64;
module.exports.getOptimizedUrl = getOptimizedUrl;
module.exports.generateThumbnail = generateThumbnail;