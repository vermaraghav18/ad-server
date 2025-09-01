// controllers/cartoonHubController.js
const fs = require('fs');
const CartoonHubSection = require('../models/cartoonHubSection');
const CartoonHubEntry = require('../models/cartoonHubEntry');
const { cloudinary } = require('../utils/cloudinary');

const toInt = (v, d = 0) => {
  if (v === undefined || v === null || v === '') return d;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : d;
};
const toBool = (v, d = false) => {
  if (typeof v === 'boolean') return v;
  const s = String(v ?? '').trim().toLowerCase();
  if (['1','true','yes','y','on'].includes(s)) return true;
  if (['0','false','no','n','off'].includes(s)) return false;
  return d;
};

// Accept a bunch of aliases from the admin UI
function parseAudience(body) {
  const kind = String(
    body.audienceKind ??
    body.audKind ??
    body.targetKind ??
    body.kind ??
    'any'
  ).trim().toLowerCase();

  const value = String(
    body.audienceValue ??
    body.audValue ??
    body.targetValue ??
    body.value ??
    ''
  ).trim();

  // normalize kind
  const k = ['category', 'state', 'city', 'any'].includes(kind) ? kind : 'any';
  return { kind: k, value: k === 'any' ? '' : value };
}

/** GET /api/cartoons/sections (and alias GET /api/cartoons) */
exports.listSections = async (_req, res) => {
  try {
    const sections = await CartoonHubSection
      .find({})
      .sort({ placementIndex: 1, sortIndex: 1, createdAt: -1 })
      .lean();

    // hydrate items per section
    const ids = sections.map(s => s._id);
    const items = await CartoonHubEntry
      .find({ sectionId: { $in: ids } })
      .sort({ sortIndex: 1, createdAt: -1 })
      .lean();

    const bySection = new Map();
    for (const it of items) {
      const k = String(it.sectionId);
      (bySection.get(k) ?? bySection.set(k, []).get(k)).push(it);
    }

    const out = sections.map(s => ({ ...s, items: bySection.get(String(s._id)) || [] }));
    res.json(out);
  } catch (e) {
    console.error('cartoons:listSections error', e);
    res.status(500).json({ message: 'Failed to load cartoon sections' });
  }
};

/** POST /api/cartoons/sections */
exports.createSection = async (req, res) => {
  try {
    const { name, heading } = req.body;
    if (!name || !heading) {
      return res.status(400).json({ message: 'name and heading are required' });
    }

    const { kind, value } = parseAudience(req.body);

    const doc = await CartoonHubSection.create({
      name: String(name).trim(),
      heading: String(heading).trim(),
      placementIndex: Math.max(1, toInt(req.body.placementIndex, 1)),
      sortIndex: toInt(req.body.sortIndex, 0),
      repeatEvery: Math.max(0, toInt(req.body.repeatEvery, 0)),
      enabled: toBool(req.body.enabled, true),
      audience: { kind, value },  // <-- tolerant audience
    });

    res.status(201).json(doc);
  } catch (e) {
    console.error('cartoons:createSection error', e);
    res.status(400).json({ message: 'Failed to create section' });
  }
};

/** PATCH /api/cartoons/sections/:id */
exports.updateSection = async (req, res) => {
  try {
    const updates = {};
    if (req.body.name != null) updates.name = String(req.body.name).trim();
    if (req.body.heading != null) updates.heading = String(req.body.heading).trim();
    if (req.body.placementIndex != null) updates.placementIndex = Math.max(1, toInt(req.body.placementIndex, 1));
    if (req.body.sortIndex != null) updates.sortIndex = toInt(req.body.sortIndex, 0);
    if (req.body.repeatEvery != null) updates.repeatEvery = Math.max(0, toInt(req.body.repeatEvery, 0));
    if (req.body.enabled != null) updates.enabled = toBool(req.body.enabled);

    // audience (accept same aliases on update)
    if (
      req.body.audienceKind != null || req.body.audKind != null ||
      req.body.targetKind != null || req.body.kind != null ||
      req.body.audienceValue != null || req.body.audValue != null ||
      req.body.targetValue != null || req.body.value != null
    ) {
      const { kind, value } = parseAudience(req.body);
      updates.audience = { kind, value };
    }

    const doc = await CartoonHubSection.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!doc) return res.status(404).json({ message: 'Section not found' });
    res.json(doc);
  } catch (e) {
    console.error('cartoons:updateSection error', e);
    res.status(400).json({ message: 'Failed to update section' });
  }
};

/** DELETE /api/cartoons/sections/:id */
exports.deleteSection = async (req, res) => {
  try {
    const id = req.params.id;
    await CartoonHubEntry.deleteMany({ sectionId: id });
    await CartoonHubSection.findByIdAndDelete(id);
    res.sendStatus(204);
  } catch (e) {
    console.error('cartoons:deleteSection error', e);
    res.status(400).json({ message: 'Failed to delete section' });
  }
};

/** POST /api/cartoons/sections/:id/items (image via 'media' or cloudinaryUrl) */
exports.createItem = async (req, res) => {
  const tmp = req.file?.path;
  try {
    const sectionId = req.params.id;
    const s = await CartoonHubSection.findById(sectionId);
    if (!s) return res.status(404).json({ message: 'Section not found' });

    let imageUrl = (req.body.cloudinaryUrl || '').trim();
    if (!imageUrl) {
      if (!req.file) return res.status(400).json({ message: "Provide 'cloudinaryUrl' or upload a file as 'media'." });
      const type = req.file.mimetype || '';
      if (!type.startsWith('image/')) {
        return res.status(400).json({ message: 'Only images are supported.' });
      }
      const up = await cloudinary.uploader.upload(req.file.path, {
        folder: 'knotshorts/cartoons',
        resource_type: 'image',
      });
      imageUrl = String(up.secure_url || '').trim();
    }

    const item = await CartoonHubEntry.create({
      sectionId,
      imageUrl,
      caption: String(req.body.caption ?? '').trim(),
      sortIndex: toInt(req.body.sortIndex, 0),
      enabled: toBool(req.body.enabled, true),
    });

    res.status(201).json(item);
  } catch (e) {
    console.error('cartoons:createItem error', e);
    res.status(400).json({ message: 'Failed to create item' });
  } finally {
    if (tmp) try { fs.unlinkSync(tmp); } catch {}
  }
};

/** PATCH /api/cartoons/items/:itemId */
exports.updateItem = async (req, res) => {
  try {
    const updates = {};
    if (req.body.caption != null) updates.caption = String(req.body.caption).trim();
    if (req.body.enabled != null) updates.enabled = toBool(req.body.enabled);
    if (req.body.sortIndex != null) updates.sortIndex = toInt(req.body.sortIndex, 0);
    const doc = await CartoonHubEntry.findByIdAndUpdate(req.params.itemId, updates, { new: true });
    if (!doc) return res.status(404).json({ message: 'Item not found' });
    res.json(doc);
  } catch (e) {
    console.error('cartoons:updateItem error', e);
    res.status(400).json({ message: 'Failed to update item' });
  }
};

/** DELETE /api/cartoons/items/:itemId */
exports.deleteItem = async (req, res) => {
  try {
    await CartoonHubEntry.findByIdAndDelete(req.params.itemId);
    res.sendStatus(204);
  } catch (e) {
    console.error('cartoons:deleteItem error', e);
    res.status(400).json({ message: 'Failed to delete item' });
  }
};

/** (Optional) GET /api/cartoons/feed-plan?section=category:Top%20News&mode=swipe */
exports.feedPlan = async (req, res) => {
  try {
    const mode = (req.query.mode || 'swipe').toString().toLowerCase(); // swipe|scroll
    const [kind, valueRaw] = (req.query.section || 'category:top').split(':', 2);
    const value = (valueRaw || '').trim();
    const audKind = (kind || 'category').trim().toLowerCase();

    const q = { enabled: true };
    if (['category', 'state', 'city'].includes(audKind)) {
      q['audience.kind'] = audKind;
      q['audience.value'] = value;
    } else {
      q['audience.kind'] = 'any';
    }

    const secs = await CartoonHubSection.find(q).sort({ placementIndex: 1, sortIndex: 1 }).lean();
    const plans = secs.map(s => ({
      sectionId: String(s._id),
      title: s.heading,
      afterNth: s.placementIndex,
      repeatEvery: s.repeatEvery || 0,
      placement: 'both',
    }));
    res.json(plans);
  } catch (e) {
    console.error('cartoons:feedPlan error', e);
    res.status(400).json({ message: 'Failed to build feed plan' });
  }
};
