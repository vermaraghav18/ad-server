const express = require('express');
const ctrl = require('../controllers/xFeedsController');

const router = express.Router();

// Admin endpoints
router.get('/', ctrl.list);          // list all (enabled first)
router.post('/', ctrl.create);       // create new
router.patch('/:id', ctrl.update);   // update fields
router.delete('/:id', ctrl.remove);  // delete

// Public: top items for a banner
router.get('/:id/items', ctrl.items); // ?limit=5 (default 5)

module.exports = router;
