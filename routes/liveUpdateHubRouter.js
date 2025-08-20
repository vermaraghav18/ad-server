const express = require('express');
const os = require('os');
const path = require('path');
const multer = require('multer');
const {
  getHub,
  createSection,
  updateSection,
  deleteSection,
  createEntry,
  updateEntry,
  deleteEntry,
} = require('../controllers/liveUpdateHubController');

const router = express.Router();

// Multer: store uploads in OS temp dir, image-only filter, optional size limit
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

// Public GET (what the Flutter app consumes)
router.get('/', getHub);

// Sections CRUD
router.post('/sections', createSection);
router.patch('/sections/:id', updateSection);
router.delete('/sections/:id', deleteSection);

// Entries CRUD
router.post('/sections/:id/entries', upload.single('media'), createEntry); // field name MUST be 'media'
router.patch('/entries/:entryId', updateEntry);
router.delete('/entries/:entryId', deleteEntry);

module.exports = router;
