const express = require('express');
const os = require('os');
const path = require('path');
const multer = require('multer');

const {
  // Public
  getHub,

  // Sections
  createSection,       // accepts JSON { backgroundImageUrl?: string }
  updateSection,       // accepts JSON { backgroundImageUrl?: string }
  updateSectionBackground, // NEW: handles file upload for per-section BG
  deleteSection,

  // Entries
  createEntry,         // multipart/form-data with field 'media'
  updateEntry,
  deleteEntry,
} = require('../controllers/liveUpdateHubController');

const router = express.Router();

/**
 * Multer setup
 * - Stores uploads in OS temp dir
 * - Image-only filter
 * - Size limit controlled by MAX_UPLOAD_MB (default 2MB)
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, os.tmpdir()),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '');
    cb(null, `liveupdate_${Date.now()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (!file || !file.mimetype) return cb(null, false);
  if (file.mimetype.startsWith('image/')) return cb(null, true);
  return cb(new Error('Only image uploads are allowed'), false);
};

const MAX_MB = parseInt(process.env.MAX_UPLOAD_MB || '2', 10);
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_MB * 1024 * 1024 },
});

/**
 * Public GET — consumed by Flutter
 * Returns the Live Update Hub (sections + entries). Each section may include:
 *  - backgroundImageUrl (string | optional)
 */
router.get('/', getHub);

/**
 * Sections CRUD
 * Note:
 *  - createSection / updateSection support JSON body with `backgroundImageUrl`.
 *  - For file-based background uploads, use PATCH /sections/:id/background
 */
router.post('/sections', createSection);
router.patch('/sections/:id', updateSection);

// NEW: Upload/replace a section's background image (swipe mode)
// Expect multipart/form-data with field name 'background'
router.patch('/sections/:id/background', upload.single('background'), updateSectionBackground);

router.delete('/sections/:id', deleteSection);

/**
 * Entries CRUD
 * createEntry expects multipart/form-data with field name 'media'
 */
router.post('/sections/:id/entries', upload.single('media'), createEntry); // field name MUST be 'media'
router.patch('/entries/:entryId', updateEntry);
router.delete('/entries/:entryId', deleteEntry);

module.exports = router;
