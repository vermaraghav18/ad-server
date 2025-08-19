// routes/liveBannerRouter.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/liveBannerController');

// Public feed (place BEFORE :id route to avoid conflict)
router.get('/public', ctrl.publicList);

// Core CRUD
router.get('/', ctrl.list);
router.get('/:id', ctrl.getOne);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.patch('/:id', ctrl.update); // allow partial updates too
router.delete('/:id', ctrl.remove);

// Sections (headings)
router.post('/:id/sections', ctrl.addSection);
router.patch('/:id/sections/:sIdx', ctrl.updateSection);
router.delete('/:id/sections/:sIdx', ctrl.deleteSection);

// Articles within a section
router.post('/:id/sections/:sIdx/articles', ctrl.addArticle);
router.patch('/:id/sections/:sIdx/articles/:aIdx', ctrl.updateArticle);
router.delete('/:id/sections/:sIdx/articles/:aIdx', ctrl.deleteArticle);

module.exports = router;
