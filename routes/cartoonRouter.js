// routes/cartoonRouter.js
const express = require('express');
const router = express.Router();
const CartoonSection = require('../models/CartoonSection');

// util
const toInt = (v, d=0) => isNaN(parseInt(v,10)) ? d : parseInt(v,10);

// ---- Sections CRUD ----

// CREATE section
router.post('/sections', async (req, res) => {
  try {
    const { title, slug, description, bannerImageUrl, isActive = true, placements = [] } = req.body;
    const created = await CartoonSection.create({ title, slug, description, bannerImageUrl, isActive, placements });
    res.status(201).json(created);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// LIST sections (filter by active optional)
router.get('/sections', async (req, res) => {
  try {
    const { active } = req.query;
    const q = {};
    if (typeof active !== 'undefined') q.isActive = active === 'true';
    const sections = await CartoonSection.find(q).sort({ createdAt: -1 }).lean();
    res.json({ items: sections });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET one section
router.get('/sections/:id', async (req, res) => {
  try {
    const s = await CartoonSection.findById(req.params.id).lean();
    if (!s) return res.status(404).json({ error: 'Not found' });
    res.json(s);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// UPDATE section
router.patch('/sections/:id', async (req, res) => {
  try {
    const update = req.body;
    const s = await CartoonSection.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!s) return res.status(404).json({ error: 'Not found' });
    res.json(s);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// DELETE section
router.delete('/sections/:id', async (req, res) => {
  try {
    const s = await CartoonSection.findByIdAndDelete(req.params.id);
    if (!s) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ---- Items within a Section ----

// ADD item to section
router.post('/sections/:id/items', async (req, res) => {
  try {
    const { imageUrl, caption, credit, order = 0, isActive = true } = req.body;
    const s = await CartoonSection.findById(req.params.id);
    if (!s) return res.status(404).json({ error: 'Section not found' });
    s.items.push({ imageUrl, caption, credit, order, isActive });
    await s.save();
    res.status(201).json(s);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// LIST items of section
router.get('/sections/:id/items', async (req, res) => {
  try {
    const s = await CartoonSection.findById(req.params.id).lean();
    if (!s) return res.status(404).json({ error: 'Section not found' });
    const onlyActive = req.query.active === 'true';
    let items = s.items || [];
    if (onlyActive) items = items.filter(i => i.isActive);
    items.sort((a,b) => (a.order ?? 0) - (b.order ?? 0));
    res.json({ items });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// UPDATE single item
router.patch('/items/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    const { imageUrl, caption, credit, order, isActive } = req.body;
    const s = await CartoonSection.findOne({ 'items._id': itemId });
    if (!s) return res.status(404).json({ error: 'Item not found' });
    const it = s.items.id(itemId);
    if (typeof imageUrl !== 'undefined') it.imageUrl = imageUrl;
    if (typeof caption !== 'undefined')  it.caption  = caption;
    if (typeof credit !== 'undefined')   it.credit   = credit;
    if (typeof order !== 'undefined')    it.order    = order;
    if (typeof isActive !== 'undefined') it.isActive = isActive;
    await s.save();
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// DELETE single item
router.delete('/items/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    const s = await CartoonSection.findOne({ 'items._id': itemId });
    if (!s) return res.status(404).json({ error: 'Item not found' });
    s.items.id(itemId).deleteOne();
    await s.save();
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// REORDER items in a section (send array of itemIds in desired order)
router.post('/sections/:id/reorder-items', async (req, res) => {
  try {
    const { order } = req.body; // [itemId1, itemId2, ...]
    const s = await CartoonSection.findById(req.params.id);
    if (!s) return res.status(404).json({ error: 'Section not found' });
    const id2order = new Map(order.map((id, idx) => [id, idx]));
    s.items = s.items
      .map(it => ({ ...it.toObject(), order: id2order.has(it._id.toString()) ? id2order.get(it._id.toString()) : (it.order||0) }))
      .sort((a,b) => (a.order ?? 0) - (b.order ?? 0));
    await s.save();
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ---- Feed plan for Flutter injection ----
// returns banner insert rules + banner image to show in-scroll
router.get('/feed-plan', async (req, res) => {
  try {
    const feed = (req.query.feed || 'home'); // 'home' | 'news_hub' | 'custom_news'
    const sections = await CartoonSection.find({
      isActive: true,
      placements: { $elemMatch: { target: { $in: [feed, 'any'] }, enabled: true } }
    }).lean();

    const plan = [];
    for (const s of sections) {
      const matches = (s.placements || []).filter(p => (p.enabled && (p.target === feed || p.target === 'any')));
      for (const p of matches) {
        plan.push({
          sectionId: s._id,
          title: s.title,
          slug: s.slug,
          afterNth: p.afterNth,
          repeatEvery: p.repeatEvery || 0,
          bannerImageUrl: s.bannerImageUrl || null,
          totalItems: (s.items || []).filter(i => i.isActive).length
        });
      }
    }
    // sort by afterNth then title to stabilize order
    plan.sort((a,b) => (a.afterNth - b.afterNth) || a.title.localeCompare(b.title));
    res.json({ feed, plan });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---- Full payload for a section (for swipe page) ----
router.get('/sections/:id/full', async (req, res) => {
  try {
    const s = await CartoonSection.findById(req.params.id).lean();
    if (!s || !s.isActive) return res.status(404).json({ error: 'Not found' });
    const items = (s.items || []).filter(i => i.isActive).sort((a,b) => (a.order ?? 0) - (b.order ?? 0));
    res.json({
      id: s._id, title: s.title, slug: s.slug, description: s.description,
      items: items.map(i => ({
        id: i._id, imageUrl: i.imageUrl, caption: i.caption, credit: i.credit, publishedAt: i.publishedAt
      }))
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

module.exports = router;
