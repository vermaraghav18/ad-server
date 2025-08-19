// ad-server/routes/liveRouter.js
const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const ctrl = require('../controllers/liveController');

const router = express.Router();

// ✅ Ensure upload dir exists
const uploadDir = path.join(__dirname, '../uploads/live');
fs.mkdirSync(uploadDir, { recursive: true });

// ✅ Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + '_' + file.fieldname + ext);
  },
});

const upload = multer({ storage });

// ── Topics ───────────────────────────────────────────────
router.post('/topics', ctrl.createTopic);
router.get('/topics', ctrl.listTopics);
router.get('/topics/:id', ctrl.getTopic);
router.patch('/topics/:id', ctrl.updateTopic);
router.delete('/topics/:id', ctrl.deleteTopic);

// ── Entries (now support file upload) ─────────────────────
router.post('/entries', upload.single('media'), ctrl.createEntry);
router.get('/entries', ctrl.listEntries);
router.patch('/entries/:id', upload.single('media'), ctrl.updateEntry);
router.delete('/entries/:id', ctrl.deleteEntry);

// ── Banner ───────────────────────────────────────────────
router.get('/banner', ctrl.getBanner);
router.patch('/banner', upload.single('media'), ctrl.updateBanner);

module.exports = router;
