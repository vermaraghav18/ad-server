// routes/videoRouter.js
const express = require('express');
const router = express.Router();
const VideoSection = require('../models/VideoSection');
const VideoEntry   = require('../models/VideoEntry');

/* --------------------------- helpers --------------------------- */
function ensureHttp(u) {
  const s = String(u || '').trim();
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) return s;
  return 'https://' + s;
}

function inWindow(entry) {
  const now = new Date();
  if (entry.publishedAt && now < entry.publishedAt) return false;
  if (entry.expiresAt   && now >= entry.expiresAt)  return false;

  const sch = entry.schedule || {};
  if (sch.daysOfWeek && sch.daysOfWeek.length) {
    const dow = ((now.getDay() + 6) % 7) + 1; // Mon=1..Sun=7
    if (!sch.daysOfWeek.includes(dow)) return false;
  }
  if (sch.startTime && sch.endTime) {
    try {
      const [sh, sm] = sch.startTime.split(':').map(Number);
      const [eh, em] = sch.endTime.split(':').map(Number);
      const mins = now.getHours() * 60 + now.getMinutes();
      const smins = sh * 60 + sm;
      const emins = eh * 60 + em;
      if (!(mins >= smins && mins <= emins)) return false;
    } catch {}
  }
  return true;
}

function normMode(m) {
  const s = String(m || '').toLowerCase();
  return s === 'scroll' || s === 'swipe' ? s : '';
}

// ------------------------------ PLAN ------------------------------
// GET /api/videos/plan
// ?sectionType=category&sectionValue=Top%20News&mode=scroll&limitPerSection=6
router.get('/plan', async (req, res) => {
  try {
    const { sectionType, sectionValue, mode } = req.query;
    const limitPerSection = Math.max(0, parseInt(req.query.limitPerSection || '6', 10));

    // pick sections
    const q = { enabled: true };
    if (sectionType && sectionType !== 'global') {
      q.$or = [
        { scopeType: 'global' },
        { scopeType: sectionType, scopeValue: sectionValue || '' },
      ];
    }

    const sections = await VideoSection.find(q)
      .sort({ sortIndex: 1, createdAt: -1 })
      .lean();

    // filter by placement vs mode (both/scroll/swipe)
    const filteredSections = sections.filter(s => {
      if (!mode) return true;
      const p = (s.placement || 'both').toLowerCase();
      return mode === 'scroll'
        ? (p === 'both' || p === 'scroll')
        : (p === 'both' || p === 'swipe');
    });

    // build plans with entries
    const plans = [];
    for (const s of filteredSections) {
      // pull section entries (live)
      const raw = await VideoEntry.find({ sectionId: s._id, status: 'live' })
        .sort({ createdAt: -1 })
        .lean();

      // time-window + schedule filter
      const windowed = raw.filter(inWindow);

      // normalize URLs
      const normalized = windowed.map(e => ({
        ...e,
        hlsUrl:      ensureHttp(e.hlsUrl),
        mp4Url:      ensureHttp(e.mp4Url),
        posterUrl:   ensureHttp(e.posterUrl),
        subtitleUrl: ensureHttp(e.subtitleUrl),
      }));

      const entries = limitPerSection > 0
        ? normalized.slice(0, limitPerSection)
        : normalized;

      plans.push({
        sectionId:   s._id.toString(),
        title:       s.title || s.sectionKey || 'Videos',
        afterNth:    s.injection?.afterNth ?? 5,
        repeatEvery: s.injection?.repeatEvery ?? 0,
        repeatCount: s.injection?.repeatCount ?? 0,
        placement:   (s.placement || 'both').toLowerCase(),
        scopeType:   s.scopeType,
        scopeValue:  s.scopeValue,
        sortIndex:   s.sortIndex ?? 0,
        entries, // <-- ✅ what Flutter needs
      });
    }

    res.json(plans);
  } catch (e) {
    console.error('❌ Video /plan error:', e);
    res.status(500).json({ message: 'Failed to build video plan' });
  }
});


// GET /api/videos/sections/:id/entries  -> entries (raw or filtered)
router.get('/sections/:id/entries', async (req, res) => {
  const { id } = req.params;
  const liveOnly = String(req.query.live || 'true') === 'true';
  const windowOnly = String(req.query.window || 'true') === 'true';

  const q = { sectionId: id };
  if (liveOnly) q.status = 'live';

  const raw = await VideoEntry.find(q).sort({ createdAt: -1 }).lean();
  const list = (windowOnly ? raw.filter(inWindow) : raw).map(e => ({
    ...e,
    hlsUrl:      ensureHttp(e.hlsUrl),
    mp4Url:      ensureHttp(e.mp4Url),
    posterUrl:   ensureHttp(e.posterUrl),
    subtitleUrl: ensureHttp(e.subtitleUrl),
  }));
  res.json(list);
});

/* ------------------------- SECTIONS CRUD ------------------------- */
// GET /api/videos/sections
router.get('/sections', async (_req, res) => {
  const list = await VideoSection.find().sort({ sortIndex: 1, createdAt: -1 });
  res.json(list);
});

// POST /api/videos/sections
router.post('/sections', async (req, res) => {
  const body = req.body || {};
  const doc = await VideoSection.create({
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

// PATCH /api/videos/sections/:id
router.patch('/sections/:id', async (req, res) => {
  const { id } = req.params;
  const body = req.body || {};
  const u = {};

  ['title','sectionKey','scopeType','scopeValue','placement','enabled'].forEach((k) => {
    if (body[k] !== undefined) u[k] = body[k];
  });
  if (body.sortIndex !== undefined) u.sortIndex = Number(body.sortIndex);
  if (body.injection) {
    u.injection = {
      afterNth:    Number(body.injection.afterNth ?? 5),
      repeatEvery: Number(body.injection.repeatEvery ?? 0),
      repeatCount: Number(body.injection.repeatCount ?? 0),
    };
  }

  const doc = await VideoSection.findByIdAndUpdate(id, u, { new: true });
  res.json(doc);
});

// DELETE /api/videos/sections/:id
router.delete('/sections/:id', async (req, res) => {
  const { id } = req.params;
  await VideoSection.findByIdAndDelete(id);
  await VideoEntry.deleteMany({ sectionId: id });
  res.json({ ok: true });
});

// GET /api/videos/sections/:id  -> section + live entries (filtered)
router.get('/sections/:id', async (req, res) => {
  const { id } = req.params;
  const section = await VideoSection.findById(id).lean();
  if (!section) return res.status(404).json({ message: 'Section not found' });

  const raw = await VideoEntry.find({ sectionId: id, status: 'live' })
    .sort({ createdAt: -1 })
    .lean();

  const entries = raw
    .filter(inWindow)
    .map(e => ({
      ...e,
      hlsUrl: ensureHttp(e.hlsUrl),
      mp4Url: ensureHttp(e.mp4Url),
      posterUrl: ensureHttp(e.posterUrl),
      subtitleUrl: ensureHttp(e.subtitleUrl),
    }));

  res.json({
    section: {
      _id: section._id,
      title: section.title,
      scopeType: section.scopeType,
      scopeValue: section.scopeValue,
      placement: section.placement,
      injection: section.injection,
      sortIndex: section.sortIndex ?? 0,
    },
    entries,
  });
});

/* -------------------------- ENTRIES CRUD -------------------------- */
// GET /api/videos/entries?sectionId=...
router.get('/entries', async (req, res) => {
  const { sectionId } = req.query;
  const q = {};
  if (sectionId) q.sectionId = sectionId;
  const list = await VideoEntry.find(q).sort({ createdAt: -1 });
  res.json(list);
});

// POST /api/videos/entries
router.post('/entries', async (req, res) => {
  const b = req.body || {};
  const doc = await VideoEntry.create({
    sectionId:  b.sectionId,
    hlsUrl:     b.hlsUrl,
    mp4Url:     b.mp4Url,
    posterUrl:  b.posterUrl,
    autoplay:   b.autoplay !== false,
    startMuted: b.startMuted !== false,
    loop:       !!b.loop,
    pipAllowed: b.pipAllowed !== false,
    durationSec: Number(b.durationSec ?? 0),
    aspect:     b.aspect || '16:9',
    caption:    b.caption || '',
    credit:     b.credit || '',
    tags:       Array.isArray(b.tags) ? b.tags : [],
    subtitleUrl: b.subtitleUrl || '',
    subtitleLang: b.subtitleLang || '',
    status:      b.status || 'live',
    publishedAt: b.publishedAt ? new Date(b.publishedAt) : undefined,
    expiresAt:   b.expiresAt ? new Date(b.expiresAt) : undefined,
    schedule: {
      daysOfWeek: Array.isArray(b.schedule?.daysOfWeek) ? b.schedule.daysOfWeek : [],
      startTime:  b.schedule?.startTime || '',
      endTime:    b.schedule?.endTime || '',
    },
  });
  res.status(201).json(doc);
});

// PATCH /api/videos/entries/:id
router.patch('/entries/:id', async (req, res) => {
  const { id } = req.params;
  const b = req.body || {};
  const u = {};

  ['sectionId','hlsUrl','mp4Url','posterUrl','caption','credit','subtitleUrl','subtitleLang','aspect','status'].forEach((k) => {
    if (b[k] !== undefined) u[k] = b[k];
  });
  if (b.tags !== undefined) u.tags = Array.isArray(b.tags) ? b.tags : [];
  ['autoplay','startMuted','loop','pipAllowed'].forEach((k) => {
    if (b[k] !== undefined) u[k] = !!b[k];
  });
  if (b.durationSec !== undefined) u.durationSec = Number(b.durationSec);
  if (b.publishedAt !== undefined) u.publishedAt = b.publishedAt ? new Date(b.publishedAt) : undefined;
  if (b.expiresAt !== undefined)   u.expiresAt   = b.expiresAt ? new Date(b.expiresAt)   : undefined;
  if (b.schedule) {
    u.schedule = {
      daysOfWeek: Array.isArray(b.schedule.daysOfWeek) ? b.schedule.daysOfWeek : [],
      startTime:  b.schedule.startTime || '',
      endTime:    b.schedule.endTime || '',
    };
  }

  const doc = await VideoEntry.findByIdAndUpdate(id, u, { new: true });
  res.json(doc);
});

// DELETE /api/videos/entries/:id
router.delete('/entries/:id', async (req, res) => {
  const { id } = req.params;
  await VideoEntry.findByIdAndDelete(id);
  res.json({ ok: true });
});

module.exports = router;
