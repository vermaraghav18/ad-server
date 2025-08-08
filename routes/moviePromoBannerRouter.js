// ad-server/routes/moviePromoBannerRouter.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const controller = require('../controllers/moviePromoBannerController');

// Multer config for promo banner uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/movie-banners');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

router.get('/', controller.getAll);
router.post('/', upload.single('poster'), controller.create); // ✅ Use multer middleware
router.delete('/:id', controller.delete);

module.exports = router;
