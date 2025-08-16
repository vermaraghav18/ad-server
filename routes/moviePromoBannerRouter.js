// ad-server/routes/moviePromoBannerRouter.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const os = require('os');
const path = require('path');
const controller = require('../controllers/moviePromoBannerController');

// Multer storage in OS temp dir; controller uploads to Cloudinary & removes the temp file
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, os.tmpdir()),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

// Accept images only; limit file size (e.g., 5 MB)
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok =
      file.mimetype === 'image/jpeg' ||
      file.mimetype === 'image/png' ||
      file.mimetype === 'image/webp' ||
      file.mimetype === 'image/gif';
    cb(ok ? null : new Error('Only image files are allowed (jpg, png, webp, gif)'), ok);
  },
});

// Routes (unchanged)
router.get('/', controller.getAll);
router.post('/', upload.single('poster'), controller.create);
router.delete('/:id', controller.delete);

module.exports = router;
