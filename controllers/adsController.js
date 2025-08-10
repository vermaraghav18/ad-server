// ad-server/controllers/adsController.js
const Ad = require('../models/adModel');
const cloudinary = require('../utils/cloudinary');
const fs = require('fs');

exports.list = async (_req, res) => {
  try {
    const ads = await Ad.find().sort({ createdAt: -1 });
    res.json(ads);
  } catch (e) {
    console.error('❌ Fetch ads failed:', e);
    res.status(500).json({ error: 'Failed to fetch ads' });
  }
};

exports.create = async (req, res) => {
  try {
    const { title, link, target, description, type } = req.body;

    if (!req.file || !link) {
      return res.status(400).json({ error: 'Image file (field: image) and link are required.' });
    }

    // Upload temp file to Cloudinary
    const up = await cloudinary.uploader.upload(req.file.path, {
      folder: 'knotshorts/ads',
      resource_type: 'image',
    });

    // Clean temp file
    try { fs.unlinkSync(req.file.path); } catch {}

    const ad = await Ad.create({
      title: (type === 'fullpage') ? '' : (title || ''),
      link,
      target: target || 'All',
      description: (type === 'fullpage') ? '' : (description || ''),
      type: type || 'normal',
      enabled: true,
      imageUrl: up.secure_url, // ✅ persistent URL
    });

    res.status(201).json(ad);
  } catch (e) {
    console.error('🔥 Create ad failed:', e);
    res.status(500).json({ error: 'Server error during ad upload.' });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await Ad.findByIdAndUpdate(id, req.body, { new: true });
    if (!doc) return res.status(404).json({ error: 'Ad not found' });
    res.json(doc);
  } catch (e) {
    console.error('❌ Update ad failed:', e);
    res.status(500).json({ error: 'Failed to update ad' });
  }
};

exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    await Ad.findByIdAndDelete(id);
    res.json({ message: 'Ad deleted' });
  } catch (e) {
    console.error('❌ Delete ad failed:', e);
    res.status(500).json({ error: 'Failed to delete ad' });
  }
};
