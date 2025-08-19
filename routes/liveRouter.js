// ad-server/routes/liveRouter.js
const express = require('express');
const ctrl = require('../controllers/liveController');
const router = express.Router();

// Topics
router.post('/topics', ctrl.createTopic);
router.get('/topics', ctrl.listTopics);
router.get('/topics/:id', ctrl.getTopic);
router.patch('/topics/:id', ctrl.updateTopic);
router.delete('/topics/:id', ctrl.deleteTopic);

// Entries
router.post('/entries', ctrl.createEntry);
router.get('/entries', ctrl.listEntries);
router.patch('/entries/:id', ctrl.updateEntry);
router.delete('/entries/:id', ctrl.deleteEntry);

// Banner
router.get('/banner', ctrl.getBanner);
router.patch('/banner', ctrl.updateBanner);

module.exports = router;
