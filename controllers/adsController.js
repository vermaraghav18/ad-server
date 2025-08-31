// ad-server/controllers/adsController.js
const Ad = require('../models/adModel');
const cloudinary = require('../utils/cloudinary');
const fs = require('fs');

/**
 * GET /api/ads
 * List ads (newest first)
 *
 * BEHAVIOR CHANGE:
 * - If the request comes from the app with `?mode=scroll`, return ZERO ads.
 *   (We want Ads feature only in Swipe mode.)
 * - If `?mode=swipe`, return enabled ads whose placement allows swipe (default "swipeOnly").
 * - If no mode is provided (admin panel), return the full list (as before).
 */
exports.list = async (req, res) => {
  try {
    const mode = String(req.query.mode || '').toLowerCase();

    // Admin list (no mode provided): show all, newest first
    if (!mode) {
      const ads = await Ad.find().sort({ createdAt: -1 });
      return res.json(ads);
    }

    // App list with explicit mode
    if (mode === 'scroll') {
      // Enforce product requirement: NO Ads in Scroll mode.
      return res.json([]);
    }

    // Swipe mode -> return enabled ads, honoring placement (swipeOnly or both)
    const ads = await Ad.find({
      enabled: true,
      placement: { $in: ['swipeOnly', 'both'] },
    }).sort({ createdAt: -1 });

    return res.json(ads);
  } catch (e) {
    console.error('❌ Fetch ads failed:', e?.message || e);
    return res.status(500).json({ error: 'Failed to fetch ads' });
  }
};

/**
 * POST /api/ads
 * Create ad (expects multipart/form-data with:
 *  - file field: "image"
 *  - body fields: link (required), title, description, target, type, placement?
 *
 * Defaults:
 *  - type: "normal"
 *  - placement: "swipeOnly" (so Ads never appear in Scroll unless explicitly changed later)
 */
exports.create = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded', field: 'image' });
    }

    const {
      title = '',
      link,
      target = 'All',
      description = '',
      type = 'normal',
      placement = 'swipeOnly', // NEW
    } = req.body;

    if (!link) {
      return res.status(400).json({ error: 'Link is required', field: 'link' });
    }

    console.log('[ADS][CREATE] body:', { title, link, target, description, type, placement });
    console.log('[ADS][CREATE] file:', req.file);

    const upload = await cloudinary.uploader.upload(req.file.path, {
      folder: 'knotshorts/ads',
      resource_type: 'image',
    });

    try { fs.unlinkSync(req.file.path); } catch {}

    const ad = await Ad.create({
      title: type === 'fullpage' ? '' : title,
      link,
      target,
      description: type === 'fullpage' ? '' : description,
      type,
      placement,             // NEW
      enabled: true,
      imageUrl: upload.secure_url,
      origin: 'ads',         // NEW (schema default, included for clarity)
    });

    console.log('[ADS][CREATE] saved:', ad._id);
    return res.status(201).json(ad);
  } catch (e) {
    const detail = e?.response?.body || e?.response?.text || e?.message || e;
    console.error('🔥 Create ad failed:', detail);
    return res.status(500).json({ error: 'Failed to create ad', detail });
  }
};

/**
 * PUT /api/ads/:id
 * Update ad (any fields)
 */
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await Ad.findByIdAndUpdate(id, req.body, { new: true });
    if (!doc) return res.status(404).json({ error: 'Ad not found' });
    return res.json(doc);
  } catch (e) {
    console.error('❌ Update ad failed:', e?.message || e);
    return res.status(500).json({ error: 'Failed to update ad' });
  }
};

/**
 * DELETE /api/ads/:id
 * Remove ad
 */
exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    await Ad.findByIdAndDelete(id);
    return res.json({ message: 'Ad deleted' });
  } catch (e) {
    console.error('❌ Delete ad failed:', e?.message || e);
    return res.status(500).json({ error: 'Failed to delete ad' });
  }
};
