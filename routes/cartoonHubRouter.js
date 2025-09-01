// routes/cartoonHubRouter.js
const express = require('express');
const multer = require('multer');
const os = require('os');
const controller = require('../controllers/cartoonHubController');

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, os.tmpdir()),
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
  }),
});

const router = express.Router();

/** ───────────── Sections listing (two aliases) ───────────── */
router.get('/', controller.listSections);             // NEW alias -> /api/cartoons
router.get('/sections', controller.listSections);     // Existing -> /api/cartoons/sections

/** ───────────── Sections CRUD ───────────── */
router.post('/sections', controller.createSection);
router.patch('/sections/:id', controller.updateSection);
router.delete('/sections/:id', controller.deleteSection);

/** ───────────── Items CRUD (images) ───────────── */
router.post('/sections/:id/items', upload.single('media'), controller.createItem);
router.patch('/items/:itemId', controller.updateItem);
router.delete('/items/:itemId', controller.deleteItem);

/** ───────────── (Optional) feed plan for app ───────────── */
router.get('/feed-plan', controller.feedPlan);

module.exports = router;
