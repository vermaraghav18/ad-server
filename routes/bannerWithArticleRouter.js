const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  createBanner,
  getBanners,
  deleteBanner
} = require('../controllers/bannerWithArticleController');

// Multer for file uploads
const storage = multer.diskStorage({});
const upload = multer({ storage });

router.post(
  '/',
  upload.fields([
    { name: 'banner', maxCount: 1 },
    { name: 'articleImage', maxCount: 1 }
  ]),
  createBanner
);

router.get('/', getBanners);
router.delete('/:id', deleteBanner);

module.exports = router;
