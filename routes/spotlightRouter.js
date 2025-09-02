// ad-server/routes/spotlightRouter.js
const express = require('express');
const router = express.Router();

const SpotlightSection = require('../models/SpotlightSection');
const SpotlightEntry = require('../models/SpotlightEntry');

// ---------- Sections CRUD ----------
router.get('/sections', async (req, res) => {
  const list = await SpotlightSection.find().sort({ updatedAt: -1 });
  res.json(list);
});

router.post('/sections', async (req, res) => {
  const s = new SpotlightSection(req.body);
  await s.save();
  res.json(s);
});

router.get('/sections/:id', async (req, res) => {
  const s = await SpotlightSection.findById(req.params.id);
  if (!s) return res.status(404).json({ error: 'not_found' });
  res.json(s);
});

router.put('/sections/:id', async (req, res) => {
  const s = await SpotlightSection.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  );
  if (!s) return res.status(404).json({ error: 'not_found' });
  res.json(s);
});

router.delete('/sections/:id', async (req, res) => {
  await SpotlightSection.findByIdAndDelete(req.params.id);
  await SpotlightEntry.deleteMany({ sectionId: req.params.id });
  res.json({ ok: true });
});

// ---------- Entries CRUD ----------
router.get('/entries', async (req, res) => {
  const q = {};
  if (req.query.sectionId) q.sectionId = req.query.sectionId;
  const entries = await SpotlightEntry.find(q).sort({ order: 1, createdAt: -1 });
  res.json(entries);
});

router.post('/entries', async (req, res) => {
  const e = new SpotlightEntry(req.body);
  await e.save();
  res.json(e);
});

router.get('/entries/:id', async (req, res) => {
  const e = await SpotlightEntry.findById(req.params.id);
  if (!e) return res.status(404).json({ error: 'not_found' });
  res.json(e);
});

router.put('/entries/:id', async (req, res) => {
  const e = await SpotlightEntry.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  );
  if (!e) return res.status(404).json({ error: 'not_found' });
  res.json(e);
});

router.delete('/entries/:id', async (req, res) => {
  await SpotlightEntry.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

// ---------- Section with entries (full) ----------
router.get('/section-full/:id', async (req, res) => {
  const s = await SpotlightSection.findById(req.params.id);
  if (!s) return res.status(404).json({ error: 'not_found' });
  const items = await SpotlightEntry
    .find({ sectionId: s._id, enabled: true })
    .sort({ order: 1, createdAt: -1 });
  res.json({ section: s, entries: items });
});

// ---------- Plan endpoint for Flutter ----------
/**
 * GET /spotlights/plan?sectionType=city&sectionValue=Delhi&mode=scroll
 * Returns array of { sectionId, title, afterNth, repeatEvery, repeatCount, placement, background }
 */
router.get('/plan', async (req, res) => {
  const { sectionType, sectionValue, mode = 'scroll' } = req.query;

  if (!sectionType || !sectionValue) {
    return res.status(400).json({ error: 'sectionType and sectionValue required' });
  }

  // simple case-insensitive match on value
  const rx = new RegExp(`^${String(sectionValue).trim()}$`, 'i');

  const sections = await SpotlightSection.find({
    enabled: true,
    sectionType,
    sectionValue: { $regex: rx },
    $or: [
      { placement: 'both' },
      { placement: mode },
    ],
  }).sort({ afterNth: 1 });

  const plan = sections.map(s => ({
    sectionId: String(s._id),
    title: s.title,
    afterNth: s.afterNth,
    repeatEvery: s.repeatEvery,
    repeatCount: s.repeatCount,
    placement: s.placement,
    background: s.background || null,
  }));

  res.json(plan);
});

module.exports = router;
