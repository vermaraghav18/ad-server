// ad-server/utils/cloudinary.js
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload a Buffer to Cloudinary using upload_stream, returns { secure_url, ... }.
 * @param {Buffer} buffer
 * @param {string} folder
 * @param {object} [options]
 */
function uploadToCloudinary(buffer, folder = 'custom-news', options = {}) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image', ...options },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });
}

module.exports = {
  cloudinary,
  uploadToCloudinary,
};
