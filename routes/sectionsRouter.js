// routes/sectionsRouter.js
const express = require('express');
const router = express.Router();
const Section = require('../models/Section');

// GET /api/sections?enabled=true
router.get('/', async (req, res) => {
  try {
    const { enabled } = req.query;
    const filter = {};
    if (enabled === 'true') filter.enabled = true;

    const items = await Section.find(filter).sort({ order: 1, name: 1 }).lean();
    res.json({ items });
  } catch (err) {
    console.error('[sections] list error', err);
    res.status(500).json({ error: 'Failed to list sections' });
  }
});

// POST /api/sections
router.post('/', async (req, res) => {
  try {
    const { name, slug, order, enabled } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name is required' });

    const doc = await Section.create({ name, slug: slug || name, order, enabled });
    res.status(201).json(doc);
  } catch (err) {
    console.error('[sections] create error', err);
    if (err.code === 11000) return res.status(409).json({ error: 'slug already exists' });
    res.status(500).json({ error: 'Failed to create section' });
  }
});

// PATCH /api/sections/:id
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, order, enabled } = req.body || {};
    const doc = await Section.findById(id);
    if (!doc) return res.status(404).json({ error: 'not found' });

    if (name !== undefined) doc.name = name;
    if (slug !== undefined) doc.slug = slug;
    if (order !== undefined) doc.order = order;
    if (enabled !== undefined) doc.enabled = enabled;

    await doc.save();
    res.json(doc);
  } catch (err) {
    console.error('[sections] update error', err);
    if (err.code === 11000) return res.status(409).json({ error: 'slug already exists' });
    res.status(500).json({ error: 'Failed to update section' });
  }
});

// DELETE /api/sections/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const out = await Section.deleteOne({ _id: id });
    res.json({ deleted: out.deletedCount === 1 });
  } catch (err) {
    console.error('[sections] delete error', err);
    res.status(500).json({ error: 'Failed to delete section' });
  }
});

module.exports = router;
