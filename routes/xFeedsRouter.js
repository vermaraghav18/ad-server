// routes/xFeedsRouter.js
const express = require('express');
const { listFeeds, listItems } = require('../controllers/xFeedsController');
const router = express.Router();

router.get('/xfeeds', listFeeds);
router.get('/xfeeds/items', listItems);

module.exports = router;
