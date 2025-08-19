const express = require('express');
const multer = require('multer');
const upload = multer(); // memory storage
const ctrl = require('../controllers/liveBannerController');

const router = express.Router();

// CRUD banner
router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.patch('/:id', ctrl.patch);
router.delete('/:id', ctrl.remove);

// 👇 NEW: media upload (image/video) for a banner
router.post('/:id/media', upload.single('media'), ctrl.uploadMedia);

// Sections
router.post('/:id/sections', ctrl.addSection);
router.patch('/:id/sections/:sIdx', ctrl.updateSection);
router.delete('/:id/sections/:sIdx', ctrl.deleteSection);

// Articles inside a section
router.post('/:id/sections/:sIdx/articles', ctrl.addArticle);
router.patch('/:id/sections/:sIdx/articles/:aIdx', ctrl.updateArticle);
router.delete('/:id/sections/:sIdx/articles/:aIdx', ctrl.deleteArticle);

module.exports = router;
