const fs = require('fs');
const LiveUpdateHubSection = require('../models/liveUpdateHubSection');
const LiveUpdateHubEntry = require('../models/liveUpdateHubEntry');
const { cloudinary } = require('../utils/cloudinary');

// Helpers to normalize incoming values like your News Hub controller
const toInt = (v, fallback = undefined) => {
  if (v === undefined || v === null || v === '') return fallback;
  const n = Number(v);
  return Number.isNaN(n) ? fallback : n;
};
const toBool = (v, fallback = undefined) => {
  if (v === undefined || v === null || v === '') return fallback;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (['true', '1', 'yes', 'y', 'on'].includes(s)) return true;
    if (['false', '0', 'no', 'n', 'off'].includes(s)) return false;
  }
  if (typeof v === 'number') return v !== 0;
  return fallback;
};

exports.getHub = async (req, res) => {
  try {
    // 1) Enabled sections sorted by placement then sortIndex
    const sections = await LiveUpdateHubSection.find({ enabled: true })
      .sort({ placementIndex: 1, sortIndex: 1, createdAt: -1 })
      .lean();

    if (!sections.length) return res.json([]);

    const sectionIds = sections.map(s => s._id);

    // 2) Enabled entries belonging to those sections, sorted by sortIndex then newest first
    const entries = await LiveUpdateHubEntry.find({
      sectionId: { $in: sectionIds },
      enabled: true,
    })
      .sort({ sortIndex: 1, createdAt: -1 })
      .lean();

    // 3) Group entries by sectionId
    const bySection = new Map();
    for (const e of entries) {
      const key = String(e.sectionId);
      if (!bySection.has(key)) bySection.set(key, []);
      bySection.get(key).push(e);
    }

    // 4) Attach entries to sections (only if entries exist)
    const output = sections.map(s => ({
      ...s,
      entries: bySection.get(String(s._id)) || [],
    }));

    res.json(output);
  } catch (err) {
    console.error('LiveUpdateHub:getHub error', err);
    res.status(500).json({ error: 'Failed to fetch Live Update Hub' });
  }
};

exports.createSection = async (req, res) => {
  try {
    const { name, heading } = req.body;
    const placementIndex = toInt(req.body.placementIndex);
    const sortIndex = toInt(req.body.sortIndex, 0);
    const enabled = toBool(req.body.enabled, true);

    if (!name || !heading || !placementIndex) {
      return res.status(400).json({ error: 'name, heading, placementIndex are required' });
    }

    const doc = await LiveUpdateHubSection.create({
      name: String(name).trim(),
      heading: String(heading).trim(),
      placementIndex,
      sortIndex,
      enabled,
    });

    res.status(201).json(doc);
  } catch (err) {
    console.error('LiveUpdateHub:createSection error', err);
    res.status(500).json({ error: 'Failed to create section' });
  }
};

exports.updateSection = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = {};
    if (req.body.name !== undefined) updates.name = String(req.body.name).trim();
    if (req.body.heading !== undefined) updates.heading = String(req.body.heading).trim();

    const placementIndex = toInt(req.body.placementIndex);
    if (placementIndex !== undefined) updates.placementIndex = placementIndex;

    const sortIndex = toInt(req.body.sortIndex);
    if (sortIndex !== undefined) updates.sortIndex = sortIndex;

    const enabled = toBool(req.body.enabled);
    if (enabled !== undefined) updates.enabled = enabled;

    const doc = await LiveUpdateHubSection.findByIdAndUpdate(id, updates, { new: true });
    if (!doc) return res.status(404).json({ error: 'Section not found' });

    res.json(doc);
  } catch (err) {
    console.error('LiveUpdateHub:updateSection error', err);
    res.status(500).json({ error: 'Failed to update section' });
  }
};

exports.deleteSection = async (req, res) => {
  try {
    const { id } = req.params;

    // Cascade delete entries then the section
    await LiveUpdateHubEntry.deleteMany({ sectionId: id });
    const result = await LiveUpdateHubSection.findByIdAndDelete(id);
    if (!result) return res.status(404).json({ error: 'Section not found' });

    res.json({ ok: true });
  } catch (err) {
    console.error('LiveUpdateHub:deleteSection error', err);
    res.status(500).json({ error: 'Failed to delete section' });
  }
};

exports.createEntry = async (req, res) => {
  const tmpPath = req.file?.path;
  try {
    const { id: sectionId } = req.params;
    const { title, description } = req.body;
    const sortIndex = toInt(req.body.sortIndex, 0);
    const enabled = toBool(req.body.enabled, true);
    const targetUrl = (req.body.targetUrl || '').trim();
    const source = (req.body.source || '').trim(); // ⬅️ NEW

    if (!sectionId) return res.status(400).json({ error: 'Section id is required' });
    if (!title || !description) {
      return res.status(400).json({ error: 'title and description are required' });
    }
    if (!req.file) return res.status(400).json({ error: 'Image file (media) is required' });

    // Upload to Cloudinary (separate folder for Live Update Hub)
    const uploadResult = await cloudinary.uploader.upload(tmpPath, {
      folder: 'knotshorts/live-update-hub',
    });

    const doc = await LiveUpdateHubEntry.create({
      sectionId,
      imageUrl: uploadResult.secure_url,
      title: String(title).trim(),
      description: String(description).trim(),
      targetUrl,
      sortIndex,
      enabled,
      source, // ⬅️ NEW
    });

    res.status(201).json(doc);
  } catch (err) {
    console.error('LiveUpdateHub:createEntry error', err);
    res.status(500).json({ error: 'Failed to create entry' });
  } finally {
    // Clean up temp file if present
    if (tmpPath) {
      try { fs.unlinkSync(tmpPath); } catch {}
    }
  }
};

exports.updateEntry = async (req, res) => {
  try {
    const { entryId } = req.params;
    const updates = {};

    if (req.body.title !== undefined) updates.title = String(req.body.title).trim();
    if (req.body.description !== undefined) updates.description = String(req.body.description).trim();
    if (req.body.targetUrl !== undefined) updates.targetUrl = String(req.body.targetUrl).trim();
    if (req.body.source !== undefined) updates.source = String(req.body.source).trim(); // ⬅️ NEW

    const sortIndex = toInt(req.body.sortIndex);
    if (sortIndex !== undefined) updates.sortIndex = sortIndex;

    const enabled = toBool(req.body.enabled);
    if (enabled !== undefined) updates.enabled = enabled;

    const doc = await LiveUpdateHubEntry.findByIdAndUpdate(entryId, updates, { new: true });
    if (!doc) return res.status(404).json({ error: 'Entry not found' });

    res.json(doc);
  } catch (err) {
    console.error('LiveUpdateHub:updateEntry error', err);
    res.status(500).json({ error: 'Failed to update entry' });
  }
};

exports.deleteEntry = async (req, res) => {
  try {
    const { entryId } = req.params;
    const result = await LiveUpdateHubEntry.findByIdAndDelete(entryId);
    if (!result) return res.status(404).json({ error: 'Entry not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('LiveUpdateHub:deleteEntry error', err);
    res.status(500).json({ error: 'Failed to delete entry' });
  }
};
