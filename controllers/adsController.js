// ad-server/controllers/adsController.js
const Ad = require('../models/adModel');
const cloudinary = require('../utils/cloudinary');
const fs = require('fs');

// Helpers
const toNonNegIntOrUndef = (v) => {
  if (v === undefined || v === null || v === '') return undefined;
  const n = Number(v);
  if (!Number.isFinite(n)) return undefined;
  return Math.max(0, Math.floor(n));
};
const normType = (t) => (['normal', 'fullpage'].includes(String(t)) ? String(t) : 'normal');
const normPlacement = (p) => (['swipeOnly', 'both'].includes(String(p)) ? String(p) : 'swipeOnly');

/**
 * GET /api/ads
 * List ads (newest first)
 *
 * BEHAVIOR:
 * - If the request comes from the app with `?mode=scroll`, return ZERO ads.
 * - If `?mode=swipe`, return enabled ads whose placement allows swipe.
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
 *  - body fields: link (required), title, description, target, type, placement
 *  - NEW body fields: afterNth, repeatEvery, repeatCount (numbers)
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
      placement = 'swipeOnly',
      afterNth,
      repeatEvery,
      repeatCount,
    } = req.body;

    if (!link) {
      return res.status(400).json({ error: 'Link is required', field: 'link' });
    }

    const upload = await cloudinary.uploader.upload(req.file.path, {
      folder: 'knotshorts/ads',
      resource_type: 'image',
    });

    try {
      fs.unlinkSync(req.file.path);
    } catch {}

    const cleanType = normType(type);
    const cleanPlacement = normPlacement(placement);

    const ad = await Ad.create({
      title: cleanType === 'fullpage' ? '' : title,
      link,
      target,
      description: cleanType === 'fullpage' ? '' : description,
      type: cleanType,
      placement: cleanPlacement,
      enabled: true,
      imageUrl: upload.secure_url,
      origin: 'ads',
      // Scheduling (non-negative integers; undefined => schema default)
      afterNth: toNonNegIntOrUndef(afterNth),
      repeatEvery: toNonNegIntOrUndef(repeatEvery),
      repeatCount: toNonNegIntOrUndef(repeatCount),
    });

    return res.status(201).json(ad);
  } catch (e) {
    const detail = e?.response?.body || e?.response?.text || e?.message || e;
    console.error('🔥 Create ad failed:', detail);
    return res.status(500).json({ error: 'Failed to create ad', detail });
  }
};

/**
 * PUT /api/ads/:id
 * Update ad (any fields). Also sanitizes scheduling + enums if provided.
 * (Note: this handler does not update images. Keep using create for image upload,
 * or extend this to accept an optional file if you want image updates here.)
 */
exports.update = async (req, res) => {
  try {
    const { id } = req.params;

    const body = { ...req.body };

    // Normalize enums if present
    if ('type' in body) body.type = normType(body.type);
    if ('placement' in body) body.placement = normPlacement(body.placement);

    // Sanitize numeric scheduling fields
    ['afterNth', 'repeatEvery', 'repeatCount'].forEach((k) => {
      if (k in body) {
        const v = toNonNegIntOrUndef(body[k]);
        if (v === undefined) {
          // If invalid/empty -> let schema defaults take over by removing key
          delete body[k];
        } else {
          body[k] = v;
        }
      }
    });

    const doc = await Ad.findByIdAndUpdate(id, body, { new: true });
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
