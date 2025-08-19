const express = require('express');
const router = express.Router();
const liveBannerController = require('../controllers/liveBannerController');

router.post('/', liveBannerController.createLiveBanner);
router.get('/', liveBannerController.getLiveBanners);
router.delete('/:id', liveBannerController.deleteLiveBanner);

module.exports = router;
