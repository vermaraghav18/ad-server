// ad-server/routes/moviePromoBannerRouter.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const os = require('os');
const path = require('path');
const controller = require('../controllers/moviePromoBannerController');

// Use OS temp dir; controller uploads to Cloudinary & removes the temp file
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, os.tmpdir()),
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
  }),
});

router.get('/', controller.getAll);
router.post('/', upload.single('poster'), controller.create);
router.delete('/:id', controller.delete);

module.exports = router;
