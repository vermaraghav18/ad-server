// ad-server/routes/cartoonHubRouter.js
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
} = require('../controllers/cartoonHubController');

const router = express.Router();

// Multer: temp storage in OS tmpdir; image-only; size limit
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, os.tmpdir()),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '');
    cb(null, `cartoon_${Date.now()}${ext}`);
  },
});
const fileFilter = (_req, file, cb) => {
  if (!file?.mimetype) return cb(null, false);
  if (file.mimetype.startsWith('image/')) return cb(null, true);
  cb(new Error('Only image uploads are allowed'), false);
};
const MAX_MB = parseInt(process.env.MAX_UPLOAD_MB || '3', 10);
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_MB * 1024 * 1024 },
});

// Public GET
router.get('/', getHub);

// Sections CRUD
router.post('/sections', createSection);
router.patch('/sections/:id', updateSection);
router.delete('/sections/:id', deleteSection);

// Entries CRUD
// NOTE: this accepts BOTH: multipart with file "media" OR multipart with only "imageUrl"
router.post('/sections/:id/entries', upload.single('media'), createEntry);
router.patch('/entries/:entryId', updateEntry);
router.delete('/entries/:entryId', deleteEntry);

module.exports = router;
