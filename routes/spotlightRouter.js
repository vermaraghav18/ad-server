// routes/spotlightRouter.js
const express = require('express');
const ctrl = require('../controllers/spotlightController');

const router = express.Router();

// sections
router.get('/sections', ctrl.listSections);
router.post('/sections', ctrl.createSection);
router.get('/sections/:id', ctrl.getSection);
router.patch('/sections/:id', ctrl.updateSection);
router.put('/sections/:id', ctrl.updateSection);
router.delete('/sections/:id', ctrl.deleteSection);

// entries
router.get('/entries', ctrl.listEntries);
router.post('/entries', ctrl.createEntry);
router.get('/entries/:id', ctrl.getEntry);
router.patch('/entries/:id', ctrl.updateEntry);
router.put('/entries/:id', ctrl.updateEntry);
router.delete('/entries/:id', ctrl.deleteEntry);

module.exports = router;
