// routes/cartoonHubRouter.js
const express = require('express');
const multer = require('multer');
const os = require('os');

const controller = require('../controllers/cartoonHubController');

// Store temp uploads in the OS temp dir (controller will push to Cloudinary)
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, os.tmpdir()),
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
  }),
});

const router = express.Router();

/**
 * GET /api/cartoon-hub/plan
 * Build a lightweight placement plan filtered by:
 *   - sectionType=global|category|state|city
 *   - sectionValue=<string>        (e.g. "Top News", "Punjab", "Mumbai")
 *   - mode=swipe|scroll            (optional; filters 'placement')
 */
router.get('/plan', controller.getPlan);

/**
 * GET /api/cartoon-hub
 * Return full sections + entries with the same filters as /plan.
 */
router.get('/', controller.getHub);

/**
 * Sections CRUD
 */
router.post('/sections', controller.createSection);
router.patch('/sections/:id', controller.updateSection);
router.delete('/sections/:id', controller.deleteSection);

/**
 * Entries CRUD
 * - Create supports either:
 *    • multipart upload under field 'media', OR
 *    • JSON body with { imageUrl: "https://..." }
 */
router.post('/sections/:id/entries', upload.single('media'), controller.createEntry);
router.patch('/entries/:entryId', controller.updateEntry);
router.delete('/entries/:entryId', controller.deleteEntry);

module.exports = router;
