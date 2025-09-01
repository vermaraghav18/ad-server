// controllers/cartoonHubController.js
const fs = require('fs');
const path = require('path');
const LiveConsole = (...args) => console.log('[CartoonHub]', ...args);

const CartoonHubSection = require('../models/cartoonHubSection');
const CartoonHubEntry = require('../models/cartoonHubEntry');
const { cloudinary } = require('../utils/cloudinary');

// ---------- helpers ----------
const toInt = (v, def = 0) => {
  if (v === undefined || v === null || v === '') return def;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : def;
};
const toBool = (v, def = undefined) => {
  if (v === undefined || v === null || v === '') return def;
  if (typeof v === 'boolean') return v;
  const s = String(v).trim().toLowerCase();
  if (['true', '1', 'yes', 'y', 'on'].includes(s)) return true;
  if (['false', '0', 'no', 'n', 'off'].includes(s)) return false;
  return def;
};
const norm = (s) => String(s || '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '')
  .trim();

function matchesScope(section, type, value) {
  // global always matches
  if (section.scopeType === 'global') return true;

  const qType = (type || '').toLowerCase();
  const qVal = norm(value || '');

  const sType = (section.scopeType || '').toLowerCase();
  const sVal = norm(section.scopeValue || '');

  if (!qType || !qVal) return false;
  if (sType !== qType) return false;

  // Treat "top" and "top news" as equal categories
  const eqTop = (x) => (x === 'top' || x === 'topnews');
  if (sType === 'category') {
    if (eqTop(qVal) && eqTop(sVal)) return true;
  }
  return sVal === qVal;
}

function matchesPlacement(section, mode) {
  const p = (section.placement || 'both').toLowerCase();
  if (p === 'both') return true;
  if (!mode) return true;
  const m = mode.toLowerCase();
  if (p === 'swipe' && m === 'swipe') return true;
  if (p === 'scroll' && m === 'scroll') return true;
  return false;
}

// ---------- GET /api/cartoon-hub/plan ----------
/**
 * Returns a lightweight plan describing where to inject sections.
 * Query:
 *  - sectionType=category|state|city
 *  - sectionValue=<string>
 *  - mode=swipe|scroll  (optional, filters 'placement')
 *
 * Response: [{ sectionId, title, afterNth, repeatEvery, repeatCount, placement }]
 */
exports.getPlan = async (req, res) => {
  try {
    const type = req.query.sectionType || req.query.type || '';
    const value = req.query.sectionValue || req.query.value || '';
    const mode = req.query.mode || '';

    // enabled, sorted by placement then sortIndex
    const sections = await CartoonHubSection.find({ enabled: true })
      .sort({ placementIndex: 1, sortIndex: 1, createdAt: -1 })
      .lean();

    const filtered = sections.filter(
      (s) => matchesPlacement(s, mode) && matchesScope(s, type, value)
    );

    const plan = filtered.map((s) => ({
      sectionId: String(s._id),
      title: s.heading,
      afterNth: Math.max(1, s.placementIndex || 1),
      repeatEvery: Math.max(0, s.repeatEvery || 0),  // 0 = no repeat
      repeatCount: Math.max(0, s.repeatCount || 0),  // 0 = unlimited
      placement: s.placement || 'both',
    }));

    res.json(plan);
  } catch (err) {
    console.error('CartoonHub:getPlan error', err);
    res.status(500).json({ error: 'Failed to build cartoon plan' });
  }
};

// ---------- GET /api/cartoon-hub ----------
/**
 * Full sections + entries, with the same filters as /plan.
 * Useful for admin preview or client when you need the items too.
 */
exports.getHub = async (req, res) => {
  try {
    const type = req.query.sectionType || req.query.type || '';
    const value = req.query.sectionValue || req.query.value || '';
    const mode = req.query.mode || '';

    const sections = await CartoonHubSection.find({ enabled: true })
      .sort({ placementIndex: 1, sortIndex: 1, createdAt: -1 })
      .lean();

    const secIds = sections
      .filter((s) => matchesPlacement(s, mode) && matchesScope(s, type, value))
      .map((s) => s._id);

    if (!secIds.length) return res.json([]);

    const entries = await CartoonHubEntry.find({
      sectionId: { $in: secIds }, enabled: true,
    })
      .sort({ sortIndex: 1, createdAt: -1 })
      .lean();

    const bySection = new Map();
    for (const e of entries) {
      const k = String(e.sectionId);
      if (!bySection.has(k)) bySection.set(k, []);
      bySection.get(k).push(e);
    }

    const out = sections
      .filter((s) => secIds.some((id) => String(id) === String(s._id)))
      .map((s) => ({ ...s, entries: bySection.get(String(s._id)) || [] }));

    res.json(out);
  } catch (err) {
    console.error('CartoonHub:getHub error', err);
    res.status(500).json({ error: 'Failed to fetch cartoon hub' });
  }
};

// ---------- Sections CRUD ----------
exports.createSection = async (req, res) => {
  try {
    const {
      name, heading,
      placementIndex, repeatEvery, repeatCount,
      sortIndex, enabled, placement,
      scopeType, scopeValue,
    } = req.body;

    if (!name || !heading || !placementIndex) {
      return res.status(400).json({ error: 'name, heading, placementIndex are required' });
    }

    const doc = await CartoonHubSection.create({
      name: String(name).trim(),
      heading: String(heading).trim(),
      placementIndex: Math.max(1, toInt(placementIndex, 1)),
      repeatEvery: Math.max(0, toInt(repeatEvery, 0)),
      repeatCount: Math.max(0, toInt(repeatCount, 0)),
      sortIndex: toInt(sortIndex, 0),
      enabled: toBool(enabled, true),
      placement: (placement || 'both').toLowerCase(),
      scopeType: (scopeType || 'global').toLowerCase(),
      scopeValue: String(scopeValue || '').trim(),
    });

    res.status(201).json(doc);
  } catch (err) {
    console.error('CartoonHub:createSection error', err);
    res.status(400).json({ error: 'Failed to create section', detail: String(err?.message || err) });
  }
};

exports.updateSection = async (req, res) => {
  try {
    const { id } = req.params;
    const u = {};
    if (req.body.name != null) u.name = String(req.body.name).trim();
    if (req.body.heading != null) u.heading = String(req.body.heading).trim();

    if (req.body.placementIndex != null) u.placementIndex = Math.max(1, toInt(req.body.placementIndex, 1));
    if (req.body.repeatEvery != null) u.repeatEvery = Math.max(0, toInt(req.body.repeatEvery, 0));
    if (req.body.repeatCount != null) u.repeatCount = Math.max(0, toInt(req.body.repeatCount, 0));
    if (req.body.sortIndex != null) u.sortIndex = toInt(req.body.sortIndex, 0);
    if (req.body.enabled != null) u.enabled = toBool(req.body.enabled, true);

    if (req.body.placement != null) u.placement = String(req.body.placement).trim().toLowerCase();
    if (req.body.scopeType != null) u.scopeType = String(req.body.scopeType).trim().toLowerCase();
    if (req.body.scopeValue != null) u.scopeValue = String(req.body.scopeValue).trim();

    const doc = await CartoonHubSection.findByIdAndUpdate(id, u, { new: true });
    if (!doc) return res.status(404).json({ error: 'Section not found' });
    res.json(doc);
  } catch (err) {
    console.error('CartoonHub:updateSection error', err);
    res.status(400).json({ error: 'Failed to update section', detail: String(err?.message || err) });
  }
};

exports.deleteSection = async (req, res) => {
  try {
    const { id } = req.params;
    await CartoonHubEntry.deleteMany({ sectionId: id });
    const ok = await CartoonHubSection.findByIdAndDelete(id);
    if (!ok) return res.status(404).json({ error: 'Section not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('CartoonHub:deleteSection error', err);
    res.status(400).json({ error: 'Failed to delete section' });
  }
};

// ---------- Entries CRUD ----------
/**
 * POST /api/cartoon-hub/sections/:id/entries
 * Accept either:
 *   - body.imageUrl (direct HTTPS/Cloudinary URL), OR
 *   - multipart file under field 'media' (will upload to Cloudinary)
 * Optional: caption, sortIndex, enabled
 */
exports.createEntry = async (req, res) => {
  const tmpPath = req.file?.path;
  try {
    const { id: sectionId } = req.params;
    const section = await CartoonHubSection.findById(sectionId);
    if (!section) return res.status(404).json({ error: 'Section not found' });

    let imageUrl = String(req.body.imageUrl || '').trim();
    if (!imageUrl && !req.file) {
      return res.status(400).json({ error: "Provide 'imageUrl' or upload a file under field 'media'." });
    }

    if (req.file) {
      // upload to Cloudinary
      const upload = await cloudinary.uploader.upload(req.file.path, {
        folder: 'knotshorts/cartoons',
        resource_type: 'image',
      });
      imageUrl = String(upload.secure_url || '').trim();
    }

    if (!/^https?:\/\//i.test(imageUrl)) {
      return res.status(400).json({ error: 'imageUrl must be an HTTP/HTTPS URL' });
    }

    const entry = await CartoonHubEntry.create({
      sectionId,
      imageUrl,
      caption: String(req.body.caption || '').trim(),
      sortIndex: toInt(req.body.sortIndex, 0),
      enabled: toBool(req.body.enabled, true),
    });

    res.status(201).json(entry);
  } catch (err) {
    console.error('CartoonHub:createEntry error', err);
    res.status(400).json({ error: 'Failed to create entry', detail: String(err?.message || err) });
  } finally {
    if (tmpPath) try { fs.unlinkSync(tmpPath); } catch {}
  }
};

exports.updateEntry = async (req, res) => {
  try {
    const { entryId } = req.params;
    const u = {};
    if (req.body.imageUrl != null) u.imageUrl = String(req.body.imageUrl).trim();
    if (req.body.caption != null) u.caption = String(req.body.caption).trim();
    if (req.body.sortIndex != null) u.sortIndex = toInt(req.body.sortIndex, 0);
    if (req.body.enabled != null) u.enabled = toBool(req.body.enabled, true);

    const doc = await CartoonHubEntry.findByIdAndUpdate(entryId, u, { new: true });
    if (!doc) return res.status(404).json({ error: 'Entry not found' });
    res.json(doc);
  } catch (err) {
    console.error('CartoonHub:updateEntry error', err);
    res.status(400).json({ error: 'Failed to update entry', detail: String(err?.message || err) });
  }
};

exports.deleteEntry = async (req, res) => {
  try {
    const { entryId } = req.params;
    const ok = await CartoonHubEntry.findByIdAndDelete(entryId);
    if (!ok) return res.status(404).json({ error: 'Entry not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('CartoonHub:deleteEntry error', err);
    res.status(400).json({ error: 'Failed to delete entry' });
  }
};
