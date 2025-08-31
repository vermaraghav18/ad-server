// ad-server/routes/newsHubRouter.js
const express = require('express');
const os = require('os');
const path = require('path');
const multer = require('multer');
const controller = require('../controllers/newsHubController');

const router = express.Router();

// Multer: temp dir, image-only filter, optional size limit
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, os.tmpdir()),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '');
    cb(null, `newshub_${Date.now()}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
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

// Sections + inline entries (enabled+sorted)
router.get('/', controller.getHub);

// Sections CRUD
router.post('/sections', controller.createSection);
router.patch('/sections/:id', controller.updateSection);
router.patch('/sections/:id/background', upload.single('background'), controller.updateSectionBackground); // <-- NEW
router.delete('/sections/:id', controller.deleteSection);

// Entries CRUD
router.post('/sections/:id/entries', upload.single('media'), controller.createEntry); // field: media
router.patch('/entries/:entryId', controller.updateEntry);
router.delete('/entries/:entryId', controller.deleteEntry);

module.exports = router;
