// controllers/geoAdsController.js
const GeoAd = require('../models/geoAdModel');
const cloudinary = require('../utils/cloudinary');
const fs = require('fs');

const toNonNegInt = (v) => Math.max(0, parseInt(v || 0, 10));

exports.list = async (req, res) => {
  try {
    const ads = await GeoAd.find().sort({ createdAt: -1 });
    res.json(ads);
  } catch (e) {
    console.error('List geo ads failed:', e);
    res.status(500).json({ error: 'Failed to fetch geo ads' });
  }
};

exports.create = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image file uploaded' });

    const {
      title = '',
      description = '',
      link,
      type = 'normal',
      cities = '[]',
      states = '[]',
      afterNth = 0,
      repeatEvery = 0,
      repeatCount = 0,
    } = req.body;

    if (!link) return res.status(400).json({ error: 'Link is required' });

    const upload = await cloudinary.uploader.upload(req.file.path, {
      folder: 'knotshorts/geo-ads',
      resource_type: 'image',
    });

    fs.unlinkSync(req.file.path);

    const ad = await GeoAd.create({
      title,
      description,
      link,
      type,
      imageUrl: upload.secure_url,
      cities: JSON.parse(cities),
      states: JSON.parse(states),
      afterNth: toNonNegInt(afterNth),
      repeatEvery: toNonNegInt(repeatEvery),
      repeatCount: toNonNegInt(repeatCount),
    });

    res.status(201).json(ad);
  } catch (e) {
    console.error('Create geo ad failed:', e);
    res.status(500).json({ error: 'Failed to create geo ad' });
  }
};

exports.remove = async (req, res) => {
  try {
    await GeoAd.findByIdAndDelete(req.params.id);
    res.json({ message: 'Geo Ad deleted' });
  } catch (e) {
    console.error('Delete geo ad failed:', e);
    res.status(500).json({ error: 'Failed to delete geo ad' });
  }
};
