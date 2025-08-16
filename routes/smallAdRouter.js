// ad-server/routes/smallAdRouter.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const os = require('os');
const controller = require('../controllers/smallAdController');

// Save to temp folder; controller uploads to Cloudinary
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, os.tmpdir()),
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
  }),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (_req, file, cb) => {
    const ok = file.mimetype.startsWith('image/') || file.mimetype === 'video/mp4';
    cb(ok ? null : new Error('Only images and MP4 videos are allowed'), ok);
  },
});

router.get('/', controller.getAll);
router.post('/', upload.single('media'), controller.create);
router.delete('/:id', controller.delete);

module.exports = router;
