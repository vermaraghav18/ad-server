// ad-server/routes/newsHubRouter.js
const express = require('express');
const multer = require('multer');
const os = require('os');
const controller = require('../controllers/newsHubController');

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, os.tmpdir()),
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
  }),
});

const router = express.Router();

// Sections + inline entries (enabled+sorted)
router.get('/', controller.getHub);

// Sections CRUD
router.post('/sections', controller.createSection);
router.patch('/sections/:id', controller.updateSection);
router.delete('/sections/:id', controller.deleteSection);

// Entries CRUD
router.post('/sections/:id/entries', upload.single('media'), controller.createEntry); // field: media
router.patch('/entries/:entryId', controller.updateEntry);
router.delete('/entries/:entryId', controller.deleteEntry);

module.exports = router;
