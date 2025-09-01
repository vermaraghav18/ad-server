// routes/cartoonRouter.js
const express = require('express');
const router = express.Router();
const CartoonSection = require('../models/CartoonSection');
const CartoonEntry   = require('../models/CartoonEntry');

// ---- helpers ----
const inWindow = (entry) => {
  const now = new Date();
  if (entry.publishedAt && now < entry.publishedAt) return false;
  if (entry.expiresAt   && now >= entry.expiresAt)  return false;

  const sch = entry.schedule || {};
  if (sch.daysOfWeek && sch.daysOfWeek.length) {
    const dow = ((now.getDay() + 6) % 7) + 1; // Mon=1..Sun=7
    if (!sch.daysOfWeek.includes(dow)) return false;
  }
  if (sch.startTime && sch.endTime) {
    const toMins = (s) => {
      const [h, m] = s.split(':').map(n => parseInt(n,10));
      return (isFinite(h) ? h : 0) * 60 + (isFinite(m) ? m : 0);
    };
    const mins = now.getHours()*60 + now.getMinutes();
    const start = toMins(sch.startTime);
    const end   = toMins(sch.endTime);
    if (start <= end) {
      if (mins < start || mins > end) return false;
    } else {
      // overnight window (e.g., 22:00–02:00)
      if (!(mins >= start || mins <= end)) return false;
    }
  }
  return true;
};

const norm = (s='') => s.toString().toLowerCase().replace(/[^a-z0-9]+/g,'');

// ---- PLAN -------------------------------------------------------------------
// GET /api/cartoons/plan?feed=home
// Optional alt: /api/cartoons/plan?sectionType=category&sectionValue=Top%20News&mode=scroll
router.get('/plan', async (req, res) => {
  try {
    const { sectionType, sectionValue, mode } = req.query;

    const q = { enabled: true };
    if (sectionType && sectionType !== 'global') {
      q.$or = [
        { scopeType: 'global' },
        { scopeType: sectionType, scopeValue: sectionValue || '' },
      ];
    }

    const sections = await CartoonSection.find(q).sort({ sortIndex: 1, createdAt: -1 }).lean();

    const plans = sections
      .filter(s => {
        if (!mode) return true;
        const p = (s.placement || 'both').toLowerCase();
        return mode === 'scroll'
          ? (p === 'both' || p === 'scroll')
          : (p === 'both' || p === 'swipe');
      })
      .map(s => ({
        sectionId:   s._id.toString(),
        title:       s.title || s.sectionKey || 'Cartoons',
        afterNth:    s.injection?.afterNth ?? 5,
        repeatEvery: s.injection?.repeatEvery ?? 0,
        repeatCount: s.injection?.repeatCount ?? 0,
        placement:   (s.placement || 'both').toLowerCase(),
      }));

    res.json(plans);
  } catch (e) {
    console.error('[cartoons/plan]', e);
    res.status(500).json({ error: 'Failed to build plan' });
  }
});

// ---- SECTIONS CRUD ----------------------------------------------------------
// GET /api/cartoons/sections
router.get('/sections', async (req, res) => {
  const list = await CartoonSection.find().sort({ sortIndex: 1, createdAt: -1 });
  res.json(list);
});

// POST /api/cartoons/sections
router.post('/sections', async (req, res) => {
  const body = req.body || {};
  const doc = await CartoonSection.create({
    title: body.title,
    sectionKey: body.sectionKey || '',
    scopeType: body.scopeType || 'global',
    scopeValue: body.scopeValue || '',
    placement: body.placement || 'both',
    injection: {
      afterNth:    Number(body.injection?.afterNth ?? 5),
      repeatEvery: Number(body.injection?.repeatEvery ?? 0),
      repeatCount: Number(body.injection?.repeatCount ?? 0),
    },
    enabled: body.enabled !== false,
    sortIndex: Number(body.sortIndex ?? 0),
  });
  res.status(201).json(doc);
});

// PATCH /api/cartoons/sections/:id
router.patch('/sections/:id', async (req, res) => {
  const { id } = req.params;
  const body = req.body || {};
  const doc = await CartoonSection.findByIdAndUpdate(id, {
    $set: {
      title: body.title,
      sectionKey: body.sectionKey,
      scopeType: body.scopeType,
      scopeValue: body.scopeValue,
      placement: body.placement,
      injection: {
        afterNth:    Number(body.injection?.afterNth ?? 5),
        repeatEvery: Number(body.injection?.repeatEvery ?? 0),
        repeatCount: Number(body.injection?.repeatCount ?? 0),
      },
      enabled: body.enabled,
      sortIndex: Number(body.sortIndex ?? 0),
    }
  }, { new: true });
  res.json(doc);
});

// DELETE /api/cartoons/sections/:id
router.delete('/sections/:id', async (req, res) => {
  const { id } = req.params;
  await CartoonSection.findByIdAndDelete(id);
  await CartoonEntry.deleteMany({ sectionId: id });
  res.json({ ok: true });
});

// GET one full section with entries (filtered live/schedule/window)
// GET /api/cartoons/sections/:id
router.get('/sections/:id', async (req, res) => {
  const { id } = req.params;
  const section = await CartoonSection.findById(id);
  if (!section) return res.status(404).json({ error: 'not found' });

  const raw = await CartoonEntry.find({ sectionId: id, status: 'live' })
    .sort({ createdAt: -1 })
    .lean();

  const entries = raw.filter(inWindow);

  res.json({
    section: {
      _id: section._id,
      title: section.title,
      scopeType: section.scopeType,
      scopeValue: section.scopeValue,
      placement: section.placement,
      injection: section.injection,
    },
    entries,
  });
});

// ---- ENTRIES CRUD -----------------------------------------------------------
// GET /api/cartoons/entries?sectionId=...
router.get('/entries', async (req, res) => {
  const { sectionId } = req.query;
  const q = {};
  if (sectionId) q.sectionId = sectionId;
  const list = await CartoonEntry.find(q).sort({ createdAt: -1 });
  res.json(list);
});

// POST /api/cartoons/entries
router.post('/entries', async (req, res) => {
  const b = req.body || {};
  const doc = await CartoonEntry.create({
    sectionId: b.sectionId,
    title: b.title,
    caption: b.caption || '',
    credit: b.credit || '',
    tags: Array.isArray(b.tags) ? b.tags : [],
    status: b.status || 'live',
    publishedAt: b.publishedAt ? new Date(b.publishedAt) : undefined,
    expiresAt: b.expiresAt ? new Date(b.expiresAt) : undefined,
    schedule: b.schedule || {},
    variants: (b.variants || []).map(v => ({
      aspect: v.aspect, url: v.url, w: v.w, h: v.h, dominantColor: v.dominantColor
    })),
  });
  res.status(201).json(doc);
});

// PATCH /api/cartoons/entries/:id
router.patch('/entries/:id', async (req, res) => {
  const { id } = req.params;
  const b = req.body || {};
  const doc = await CartoonEntry.findByIdAndUpdate(id, {
    $set: {
      sectionId: b.sectionId,
      title: b.title,
      caption: b.caption,
      credit: b.credit,
      tags: b.tags,
      status: b.status,
      publishedAt: b.publishedAt ? new Date(b.publishedAt) : undefined,
      expiresAt: b.expiresAt ? new Date(b.expiresAt) : undefined,
      schedule: b.schedule,
      variants: (b.variants || []).map(v => ({
        aspect: v.aspect, url: v.url, w: v.w, h: v.h, dominantColor: v.dominantColor
      })),
    }
  }, { new: true });
  res.json(doc);
});

// DELETE /api/cartoons/entries/:id
router.delete('/entries/:id', async (req, res) => {
  const { id } = req.params;
  await CartoonEntry.findByIdAndDelete(id);
  res.json({ ok: true });
});

module.exports = router;
