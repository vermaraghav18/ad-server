const express = require('express');
const router = express.Router();
const Tweets = require('../controllers/tweetsController');

// GET /api/tweets?section=Top%20News&enabled=true
router.get('/', Tweets.list);

// POST /api/tweets
router.post('/', Tweets.create);

// Bulk import from RSS (no deps)
router.post('/import-simple', Tweets.importFromRssSimple);

// PUT /api/tweets/:id
router.put('/:id', Tweets.update);

// DELETE /api/tweets/:id
router.delete('/:id', Tweets.remove);

module.exports = router;
