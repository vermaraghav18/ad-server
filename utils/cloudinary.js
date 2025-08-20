// ad-server/utils/cloudinary.js
const { v2: c } = require('cloudinary');

// Prefer explicit keys; fall back to CLOUDINARY_URL if provided
const hasKeys =
  !!process.env.CLOUDINARY_CLOUD_NAME &&
  !!process.env.CLOUDINARY_API_KEY &&
  !!process.env.CLOUDINARY_API_SECRET;

if (hasKeys) {
  c.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
} else if (process.env.CLOUDINARY_URL) {
  // Cloudinary SDK reads credentials from CLOUDINARY_URL
  c.config({ secure: true });
} else {
  console.warn('[Cloudinary] Missing credentials. Set CLOUDINARY_URL or (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET).');
}

/**
 * Upload a Buffer to Cloudinary using upload_stream.
 * Default folder: "knotshorts/live".
 * Set options.resource_type = 'image' | 'video' | 'auto'
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
 * Upload a file path to Cloudinary.
 */
function uploadPath(filePath, folder = 'knotshorts/live', options = {}) {
  return c.uploader.upload(filePath, { folder, resource_type: options.resource_type || 'image', ...options });
}

/**
 * Delete by public_id (optional, for cleanup on entry delete).
 * Example publicId: "knotshorts/live-update-hub/abcd1234"
 */
async function deleteByPublicId(publicId, options = {}) {
  return c.uploader.destroy(publicId, options); // options.resource_type if needed
}

// Exports
module.exports = c;
module.exports.cloudinary = c;
module.exports.uploadBuffer = uploadBuffer;
module.exports.uploadToCloudinary = uploadBuffer; // alias
module.exports.uploadPath = uploadPath;
module.exports.deleteByPublicId = deleteByPublicId;
