// ad-server/controllers/newsHubController.js
const fs = require('fs');
const NewsHubSection = require('../models/newsHubSection');
const NewsHubEntry = require('../models/newsHubEntry');
const { cloudinary } = require('../utils/cloudinary');

function toBool(v) {
  if (typeof v === 'boolean') return v;
  const s = String(v ?? '').toLowerCase().trim();
  return s === '1' || s === 'true' || s === 'yes';
}
function toInt(v, def = 0) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : def;
}

/** GET /api/news-hub
 * Returns enabled sections (sorted by placementIndex, sortIndex)
 * with enabled entries (sorted by sortIndex)
 */
exports.getHub = async (_req, res) => {
  try {
    const sections = await NewsHubSection.find({ enabled: true })
      .sort({ placementIndex: 1, sortIndex: 1 })
      .lean();

    const ids = sections.map((s) => s._id);
    const entries = await NewsHubEntry.find({
      sectionId: { $in: ids },
      enabled: true,
    })
      .sort({ sortIndex: 1, createdAt: 1 })
      .lean();

    const bySection = new Map();
    for (const e of entries) {
      const k = String(e.sectionId);
      if (!bySection.has(k)) bySection.set(k, []);
      bySection.get(k).push(e);
    }

    const result = sections.map((s) => ({
      ...s,
      entries: bySection.get(String(s._id)) || [],
    }));

    res.json(result);
  } catch (err) {
    console.error('❌ NewsHub getHub error:', err);
    res.status(500).json({ message: 'Failed to load News Hub', error: String(err?.message || err) });
  }
};

/** POST /api/news-hub/sections */
exports.createSection = async (req, res) => {
  try {
    const { name, heading, placementIndex, enabled, sortIndex } = req.body;
    if (!name || !heading || !placementIndex) {
      return res.status(400).json({ message: 'name, heading, placementIndex are required' });
    }
    const doc = await NewsHubSection.create({
      name: String(name).trim(),
      heading: String(heading).trim(),
      placementIndex: Math.max(1, toInt(placementIndex, 1)),
      sortIndex: toInt(sortIndex, 0),
      enabled: toBool(enabled ?? true),
    });
    res.status(201).json(doc);
  } catch (err) {
    console.error('❌ NewsHub createSection error:', err);
    res.status(400).json({ message: 'Failed to create section', error: String(err?.message || err) });
  }
};

/** PATCH /api/news-hub/sections/:id */
exports.updateSection = async (req, res) => {
  try {
    const updates = {};
    if (req.body.name != null) updates.name = String(req.body.name).trim();
    if (req.body.heading != null) updates.heading = String(req.body.heading).trim();
    if (req.body.placementIndex != null) updates.placementIndex = Math.max(1, toInt(req.body.placementIndex, 1));
    if (req.body.sortIndex != null) updates.sortIndex = toInt(req.body.sortIndex, 0);
    if (req.body.enabled != null) updates.enabled = toBool(req.body.enabled);

    const doc = await NewsHubSection.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!doc) return res.status(404).json({ message: 'Section not found' });
    res.json(doc);
  } catch (err) {
    console.error('❌ NewsHub updateSection error:', err);
    res.status(400).json({ message: 'Failed to update section', error: String(err?.message || err) });
  }
};

/** DELETE /api/news-hub/sections/:id */
exports.deleteSection = async (req, res) => {
  try {
    const id = req.params.id;
    await NewsHubEntry.deleteMany({ sectionId: id });
    await NewsHubSection.findByIdAndDelete(id);
    res.sendStatus(204);
  } catch (err) {
    console.error('❌ NewsHub deleteSection error:', err);
    res.status(400).json({ message: 'Failed to delete section', error: String(err?.message || err) });
  }
};

/** POST /api/news-hub/sections/:id/entries  (multipart: media, fields) */
exports.createEntry = async (req, res) => {
  try {
    const sectionId = req.params.id;
    const section = await NewsHubSection.findById(sectionId);
    if (!section) return res.status(404).json({ message: 'Section not found' });

    if (!req.file) {
      return res.status(400).json({ message: "Media file is required (field name: 'media')." });
    }
    // Only images for entries (news cards)
    const type = req.file.mimetype || '';
    if (!type.startsWith('image/')) {
      return res.status(400).json({ message: 'Only image uploads are supported for News Hub entries.' });
    }

    const { title, description, targetUrl, sortIndex, enabled } = req.body;
    if (!title || !description) {
      return res.status(400).json({ message: 'title and description are required' });
    }

    // Upload to Cloudinary
    const upload = await cloudinary.uploader.upload(req.file.path, {
      folder: 'knotshorts/news-hub',
      resource_type: 'image',
    });

    // best-effort cleanup
    try { fs.unlinkSync(req.file.path); } catch {}

    const entry = await NewsHubEntry.create({
      sectionId,
      imageUrl: upload.secure_url,
      title: String(title).trim(),
      description: String(description).trim(),
      targetUrl: String(targetUrl ?? '').trim(),
      sortIndex: toInt(sortIndex, 0),
      enabled: toBool(enabled ?? true),
    });

    res.status(201).json(entry);
  } catch (err) {
    console.error('❌ NewsHub createEntry error:', err);
    res.status(400).json({ message: 'Failed to create entry', error: String(err?.message || err) });
  }
};

/** PATCH /api/news-hub/entries/:entryId  (JSON only) */
exports.updateEntry = async (req, res) => {
  try {
    const updates = {};
    if (req.body.title != null) updates.title = String(req.body.title).trim();
    if (req.body.description != null) updates.description = String(req.body.description).trim();
    if (req.body.targetUrl != null) updates.targetUrl = String(req.body.targetUrl).trim();
    if (req.body.sortIndex != null) updates.sortIndex = toInt(req.body.sortIndex, 0);
    if (req.body.enabled != null) updates.enabled = toBool(req.body.enabled);

    const doc = await NewsHubEntry.findByIdAndUpdate(req.params.entryId, updates, { new: true });
    if (!doc) return res.status(404).json({ message: 'Entry not found' });
    res.json(doc);
  } catch (err) {
    console.error('❌ NewsHub updateEntry error:', err);
    res.status(400).json({ message: 'Failed to update entry', error: String(err?.message || err) });
  }
};

/** DELETE /api/news-hub/entries/:entryId */
exports.deleteEntry = async (req, res) => {
  try {
    await NewsHubEntry.findByIdAndDelete(req.params.entryId);
    res.sendStatus(204);
  } catch (err) {
    console.error('❌ NewsHub deleteEntry error:', err);
    res.status(400).json({ message: 'Failed to delete entry', error: String(err?.message || err) });
  }
};
