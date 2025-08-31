// ad-server/controllers/cartoonHubController.js
const fs = require('fs');
const os = require('os');
const CartoonHubSection = require('../models/cartoonHubSection');
const CartoonHubEntry   = require('../models/cartoonHubEntry');
const { cloudinary }    = require('../utils/cloudinary');

// helpers
const toInt = (v, fb = undefined) => {
  if (v === undefined || v === null || v === '') return fb;
  const n = Number(v);
  return Number.isNaN(n) ? fb : n;
};
const toBool = (v, fb = undefined) => {
  if (v === undefined || v === null || v === '') return fb;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  const s = String(v).trim().toLowerCase();
  if (['true','1','yes','y','on'].includes(s)) return true;
  if (['false','0','no','n','off'].includes(s)) return false;
  return fb;
};
const ensureHttp = (u) => {
  if (!u) return '';
  const s = String(u).trim();
  if (!s) return '';
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
};

// GET /api/cartoon-hub
// Enabled sections (sorted by placementIndex, sortIndex) + their enabled entries (sorted)
exports.getHub = async (_req, res) => {
  try {
    const sections = await CartoonHubSection.find({ enabled: true })
      .sort({ placementIndex: 1, sortIndex: 1, createdAt: -1 })
      .lean();

    if (!sections.length) return res.json([]);

    const sectionIds = sections.map(s => s._id);
    const entries = await CartoonHubEntry.find({
      sectionId: { $in: sectionIds },
      enabled: true,
    })
      .sort({ sortIndex: 1, createdAt: -1 })
      .lean();

    const bySection = new Map();
    for (const e of entries) {
      const key = String(e.sectionId);
      if (!bySection.has(key)) bySection.set(key, []);
      bySection.get(key).push(e);
    }

    const out = sections.map(s => ({
      ...s,
      entries: bySection.get(String(s._id)) || [],
    }));

    res.json(out);
  } catch (err) {
    console.error('❌ CartoonHub:getHub error', err);
    res.status(500).json({ message: 'Failed to load Cartoon Hub', error: String(err?.message || err) });
  }
};

// POST /api/cartoon-hub/sections
exports.createSection = async (req, res) => {
  try {
    const { name, heading } = req.body;
    const placementIndex = toInt(req.body.placementIndex);
    const repeatEvery    = toInt(req.body.repeatEvery, 0);
    const sortIndex      = toInt(req.body.sortIndex, 0);
    const enabled        = toBool(req.body.enabled, true);

    if (!name || !heading || !placementIndex) {
      return res.status(400).json({ message: 'name, heading, placementIndex are required' });
    }

    const doc = await CartoonHubSection.create({
      name: String(name).trim(),
      heading: String(heading).trim(),
      placementIndex,
      repeatEvery: Math.max(0, repeatEvery || 0),
      sortIndex,
      enabled,
    });

    res.status(201).json(doc);
  } catch (err) {
    console.error('❌ CartoonHub:createSection error', err);
    res.status(400).json({ message: 'Failed to create section', error: String(err?.message || err) });
  }
};

// PATCH /api/cartoon-hub/sections/:id
exports.updateSection = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = {};

    if (req.body.name !== undefined)     updates.name = String(req.body.name).trim();
    if (req.body.heading !== undefined)  updates.heading = String(req.body.heading).trim();

    const placementIndex = toInt(req.body.placementIndex);
    if (placementIndex !== undefined) updates.placementIndex = placementIndex;

    const repeatEvery = toInt(req.body.repeatEvery);
    if (repeatEvery !== undefined) updates.repeatEvery = Math.max(0, repeatEvery);

    const sortIndex = toInt(req.body.sortIndex);
    if (sortIndex !== undefined) updates.sortIndex = sortIndex;

    const enabled = toBool(req.body.enabled);
    if (enabled !== undefined) updates.enabled = enabled;

    const doc = await CartoonHubSection.findByIdAndUpdate(id, updates, { new: true });
    if (!doc) return res.status(404).json({ message: 'Section not found' });

    res.json(doc);
  } catch (err) {
    console.error('❌ CartoonHub:updateSection error', err);
    res.status(400).json({ message: 'Failed to update section', error: String(err?.message || err) });
  }
};

// DELETE /api/cartoon-hub/sections/:id
exports.deleteSection = async (req, res) => {
  try {
    const { id } = req.params;
    await CartoonHubEntry.deleteMany({ sectionId: id });
    const result = await CartoonHubSection.findByIdAndDelete(id);
    if (!result) return res.status(404).json({ message: 'Section not found' });
    res.sendStatus(204);
  } catch (err) {
    console.error('❌ CartoonHub:deleteSection error', err);
    res.status(400).json({ message: 'Failed to delete section', error: String(err?.message || err) });
  }
};

// POST /api/cartoon-hub/sections/:id/entries   (multipart OR multipart-with-imageUrl field)
// fields: imageUrl (optional if file provided), caption, sortIndex, enabled
// file:   media (optional if imageUrl provided)
exports.createEntry = async (req, res) => {
  const tmpPath = req.file?.path;
  try {
    const { id: sectionId } = req.params;
    const section = await CartoonHubSection.findById(sectionId);
    if (!section) return res.status(404).json({ message: 'Section not found' });

    const sortIndex = toInt(req.body.sortIndex, 0);
    const enabled   = toBool(req.body.enabled, true);
    const caption   = (req.body.caption || '').trim();

    let finalImageUrl = '';
    // Prefer file upload if present
    if (req.file) {
      const type = req.file.mimetype || '';
      if (!type.startsWith('image/')) {
        return res.status(400).json({ message: 'Only image uploads are allowed' });
      }
      const upload = await cloudinary.uploader.upload(tmpPath, {
        folder: 'knotshorts/cartoon-hub',
        resource_type: 'image',
      });
      finalImageUrl = String(upload.secure_url || '').trim();
    } else {
      // else accept provided URL
      finalImageUrl = ensureHttp(req.body.imageUrl || '');
    }

    if (!finalImageUrl) {
      return res.status(400).json({ message: 'Provide an image via file (media) or a valid imageUrl' });
    }

    const doc = await CartoonHubEntry.create({
      sectionId,
      imageUrl: finalImageUrl,
      caption,
      sortIndex,
      enabled,
    });

    res.status(201).json(doc);
  } catch (err) {
    console.error('❌ CartoonHub:createEntry error', err);
    res.status(400).json({ message: 'Failed to create entry', error: String(err?.message || err) });
  } finally {
    if (tmpPath) try { fs.unlinkSync(tmpPath); } catch {}
  }
};

// PATCH /api/cartoon-hub/entries/:entryId
exports.updateEntry = async (req, res) => {
  try {
    const { entryId } = req.params;
    const updates = {};

    if (req.body.caption !== undefined)  updates.caption = String(req.body.caption).trim();
    if (req.body.imageUrl !== undefined) {
      const u = ensureHttp(req.body.imageUrl);
      if (!u) return res.status(400).json({ message: 'imageUrl must be a valid URL' });
      updates.imageUrl = u;
    }

    const sortIndex = toInt(req.body.sortIndex);
    if (sortIndex !== undefined) updates.sortIndex = sortIndex;

    const enabled = toBool(req.body.enabled);
    if (enabled !== undefined) updates.enabled = enabled;

    const doc = await CartoonHubEntry.findByIdAndUpdate(entryId, updates, { new: true });
    if (!doc) return res.status(404).json({ message: 'Entry not found' });

    res.json(doc);
  } catch (err) {
    console.error('❌ CartoonHub:updateEntry error', err);
    res.status(400).json({ message: 'Failed to update entry', error: String(err?.message || err) });
  }
};

// DELETE /api/cartoon-hub/entries/:entryId
exports.deleteEntry = async (req, res) => {
  try {
    const { entryId } = req.params;
    const result = await CartoonHubEntry.findByIdAndDelete(entryId);
    if (!result) return res.status(404).json({ message: 'Entry not found' });
    res.sendStatus(204);
  } catch (err) {
    console.error('❌ CartoonHub:deleteEntry error', err);
    res.status(400).json({ message: 'Failed to delete entry', error: String(err?.message || err) });
  }
};
