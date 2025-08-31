// routes/bannerConfigRouter.js  (DROP-IN: adds /meta + keeps filters on list)
// Exposes:
//   GET    /            -> list (supports ?mode&activeOnly&sectionType&sectionValue)
//   GET    /meta        -> enum metadata for admin pickers (categories/cities/states)
//   GET    /:id         -> get one
//   POST   /            -> create
//   PUT    /:id         -> update
//   DELETE /:id         -> delete

const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/bannerConfigController');
const BannerConfig = require('../models/BannerConfig');

// LIST
router.get('/', ctrl.list);

// META (declare before '/:id' so it doesn't get captured as an id)
router.get('/meta', (_req, res) => {
  try {
    const tPath = BannerConfig.schema.path('targets');
    const tSchema = tPath && tPath.schema ? tPath.schema : null;

    if (!tSchema) {
      return res.status(500).json({
        error: 'meta_unavailable',
        message: 'Targets subschema not found on BannerConfig',
      });
    }

    const catPath = tSchema.path('categories');
    const cityPath = tSchema.path('cities');
    const statePath = tSchema.path('states');

    const categories =
      (catPath && catPath.caster && catPath.caster.enumValues) ? catPath.caster.enumValues : [];
    const cities =
      (cityPath && cityPath.caster && cityPath.caster.enumValues) ? cityPath.caster.enumValues : [];
    const states =
      (statePath && statePath.caster && statePath.caster.enumValues) ? statePath.caster.enumValues : [];

    res.json({ categories, cities, states });
  } catch (e) {
    console.error('[banner-config.meta]', e);
    res.status(500).json({ error: 'meta_unavailable', message: e.message });
  }
});

// GET ONE
router.get('/:id', ctrl.get);

// CREATE
router.post('/', ctrl.create);

// UPDATE
router.put('/:id', ctrl.update);

// DELETE
router.delete('/:id', ctrl.remove);

module.exports = router;
