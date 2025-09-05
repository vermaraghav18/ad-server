// routes/videoGeoAdsRouter.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/videoGeoAdsController');

// JSON-only. No file uploads (we paste CDN URLs).
router.get('/', ctrl.list);
router.get('/:id', ctrl.get);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
