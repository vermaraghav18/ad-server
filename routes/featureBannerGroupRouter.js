// routes/featureBannerGroupRouter.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/featureBannerGroupController');

// NOTE: handlers must be functions; don't call them here.
router.get('/',        ctrl.list);
router.get('/active',  ctrl.listActiveByCategory);
router.post('/',       ctrl.create);
router.put('/:id',     ctrl.update);
router.delete('/:id',  ctrl.remove);

module.exports = router;
