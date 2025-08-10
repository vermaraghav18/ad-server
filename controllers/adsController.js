// ad-server/controllers/adsController.js
const Ad = require('../models/adModel');
const cloudinary = require('../utils/cloudinary');
const fs = require('fs');

/**
 * GET /api/ads
 * List ads (newest first)
 */
exports.list = async (_req, res) => {
  try {
    const ads = await Ad.find().sort({ createdAt: -1 });
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
 *  - body fields: link (required), title, description, target, type
 */
exports.create = async (req, res) => {
  try {
    // 1) Validate inputs early (so we return 400 with a clear reason)
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded', field: 'image' });
    }

    const {
      title = '',
      link,
      target = 'All',
      description = '',
      type = 'normal',
    } = req.body;

    if (!link) {
      return res.status(400).json({ error: 'Link is required', field: 'link' });
    }

    // 2) Log what we received (shows up in Render logs)
    console.log('[ADS][CREATE] body:', { title, link, target, description, type });
    console.log('[ADS][CREATE] file:', req.file);

    // 3) Upload temp file to Cloudinary
    const upload = await cloudinary.uploader.upload(req.file.path, {
      folder: 'knotshorts/ads',
      resource_type: 'image',
    });

    // 4) Clean temp file (ignore errors)
    try { fs.unlinkSync(req.file.path); } catch {}

    // 5) Save to Mongo
    const ad = await Ad.create({
      title: type === 'fullpage' ? '' : title,
      link,
      target,
      description: type === 'fullpage' ? '' : description,
      type,
      enabled: true,
      imageUrl: upload.secure_url, // full Cloudinary URL
    });

    console.log('[ADS][CREATE] saved:', ad._id);
    return res.status(201).json(ad);
  } catch (e) {
    // Cloudinary often nests messages on e.response; surface them
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
