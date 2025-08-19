// ad-server/utils/cloudinary.js
const { v2: c } = require('cloudinary');

// Configure from env
c.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// Optional: one-time warning if env is missing (won't crash)
(function warnIfMissingEnv() {
  const missing = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']
    .filter((k) => !process.env[k]);
  if (missing.length) {
    console.warn('[Cloudinary] Missing env:', missing.join(', '));
  }
})();

/**
 * Upload a Buffer to Cloudinary using upload_stream.
 * Supports both images and videos (via options.resource_type).
 * Default folder: "knotshorts/live".
 */
function uploadBuffer(buffer, folder = 'knotshorts/live', options = {}) {
  return new Promise((resolve, reject) => {
    const stream = c.uploader.upload_stream(
      { folder, resource_type: options.resource_type || 'image', ...options },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });
}

/**
 * Upload a file from disk (path) to Cloudinary.
 * Supports both images and videos (via options.resource_type).
 * Default folder: "knotshorts/live".
 */
function uploadPath(filePath, folder = 'knotshorts/live', options = {}) {
  return c.uploader.upload(filePath, { folder, resource_type: options.resource_type || 'image', ...options });
}

// Export the v2 instance as default and named
module.exports = c;
module.exports.cloudinary = c;

// Helpers
module.exports.uploadBuffer = uploadBuffer;
module.exports.uploadToCloudinary = uploadBuffer; // alias for back-compat
module.exports.uploadPath = uploadPath;
