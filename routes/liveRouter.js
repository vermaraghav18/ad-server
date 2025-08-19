// ad-server/routes/liveRouter.js
const express = require('express');
const multer = require('multer');
const ctrl = require('../controllers/liveController');

const router = express.Router();

// ✅ Memory storage for Cloudinary
const upload = multer({ storage: multer.memoryStorage() });

// ── Topics ───────────────────────────────────────────────
router.post('/topics', ctrl.createTopic);
router.get('/topics', ctrl.listTopics);
router.get('/topics/:id', ctrl.getTopic);
router.patch('/topics/:id', ctrl.updateTopic);
router.delete('/topics/:id', ctrl.deleteTopic);

// ── Entries (with media upload) ──────────────────────────
// ✅ title is now required (enforced inside controller)
router.post('/entries', upload.single('media'), ctrl.createEntry);
router.get('/entries', ctrl.listEntries);
router.patch('/entries/:id', upload.single('media'), ctrl.updateEntry);
router.delete('/entries/:id', ctrl.deleteEntry);

// ── Banner (with media upload) ───────────────────────────
router.get('/banner', ctrl.getBanner);
router.patch('/banner', upload.single('media'), ctrl.updateBanner);

module.exports = router;
