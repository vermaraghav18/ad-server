// ad-server/utils/cloudinary.js
const { v2: cloudinary } = require('cloudinary');

// Configure from env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Upload a Buffer to Cloudinary using upload_stream.
 * Returns the full Cloudinary response (e.g., { secure_url, public_id, ... }).
 *
 * @param {Buffer} buffer
 * @param {string} [folder='knotshorts/movie-banners']
 * @param {object} [options]
 * @returns {Promise<object>}
 */
function uploadToCloudinary(buffer, folder = 'knotshorts/movie-banners', options = {}) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image', ...options },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });
}

// Export the v2 instance directly so controller code like
// `const cloudinary = require('../utils/cloudinary')` works.
module.exports = cloudinary;
// Also export the helper for optional buffer uploads.
module.exports.uploadToCloudinary = uploadToCloudinary;
