// routes/feedRouter.js
const express = require('express');
const router = express.Router();
const feedController = require('../controllers/feedController');

router.get('/', feedController.getAllFeeds); // Flutter app
router.get('/all', feedController.getAllFeedsAdmin); // Admin panel
router.post('/', feedController.createFeed);
router.put('/:id', feedController.updateFeed);
router.delete('/:id', feedController.deleteFeed);

module.exports = router;
