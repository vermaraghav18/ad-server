// ad-server/routes/shortsRouter.js
const express = require('express');
const router = express.Router();
const Shorts = require('../controllers/shortsController');

// GET /api/shorts?section=India&enabled=true
router.get('/', Shorts.list);

// POST /api/shorts
router.post('/', Shorts.create);

// ▶️ Import many from RSS (no external deps)
router.post('/import-simple', Shorts.importFromRssSimple);

// PUT /api/shorts/:id
router.put('/:id', Shorts.update);

// DELETE /api/shorts/:id
router.delete('/:id', Shorts.remove);

module.exports = router;
