const express = require('express');
const router = express.Router();
const liveBannerController = require('../controllers/liveBannerController');
const multer = require('multer');

// Temporary local destination; file immediately goes to Cloudinary
const upload = multer({ dest: 'uploads/live-banners/' });

// 🔥 POST = create new live banner
router.post(
  '/',
  upload.single('bannerImage'),   // field name = bannerImage
  liveBannerController.createLiveBanner
);

// 🔥 GET = all live banners
router.get('/', liveBannerController.getLiveBanners);

// 🔥 DELETE = delete live banner by id
router.delete('/:id', liveBannerController.deleteLiveBanner);

module.exports = router;
