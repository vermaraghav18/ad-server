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
 * Upload a Buffer to Cloudinary using upload_stream (images by default).
 * Returns the full Cloudinary response (e.g., { secure_url, public_id, ... }).
 */
function uploadBuffer(buffer, folder = 'knotshorts/default', options = {}) {
  return new Promise((resolve, reject) => {
    const stream = c.uploader.upload_stream(
      { folder, resource_type: 'image', ...options },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });
}

/**
 * Upload a file from disk (path) to Cloudinary (images by default).
 */
function uploadPath(filePath, folder = 'knotshorts/default', options = {}) {
  return c.uploader.upload(filePath, { folder, resource_type: 'image', ...options });
}

// Export the v2 instance as the default AND as a named export so both import styles work.
module.exports = c;
module.exports.cloudinary = c;

// Back-compat + helpers
module.exports.uploadBuffer = uploadBuffer;
module.exports.uploadToCloudinary = uploadBuffer; // alias to keep your old name working
module.exports.uploadPath = uploadPath;
