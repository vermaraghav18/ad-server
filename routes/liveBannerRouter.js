const express = require('express');
const router = express.Router();
const liveBannerController = require('../controllers/liveBannerController');
const multer = require('multer');

// Temporary local destination; file is immediately uploaded to Cloudinary
const upload = multer({ dest: 'uploads/live-banners/' });

router.post('/', upload.single('image'), liveBannerController.createLiveBanner);
router.get('/', liveBannerController.getLiveBanners);
router.delete('/:id', liveBannerController.deleteLiveBanner);

module.exports = router;
