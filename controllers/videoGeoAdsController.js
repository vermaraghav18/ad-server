// controllers/videoGeoAdsController.js
const VideoGeoAd = require('../models/VideoGeoAd');

exports.list = async (req, res) => {
  try {
    const { enabled } = req.query;
    const q = {};
    if (enabled === 'true') q.enabled = true;
    if (enabled === 'false') q.enabled = false;

    const items = await VideoGeoAd.find(q).sort({ updatedAt: -1 }).lean();
    res.json(items);
  } catch (e) {
    console.error('VideoGeoAd list failed:', e);
    res.status(500).json({ error: 'Failed to list video geo ads' });
  }
};

exports.get = async (req, res) => {
  try {
    const item = await VideoGeoAd.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (e) {
    console.error('VideoGeoAd get failed:', e);
    res.status(500).json({ error: 'Failed to get video geo ad' });
  }
};

exports.create = async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.videoUrl) return res.status(400).json({ error: 'videoUrl is required' });
    if (!body.link) return res.status(400).json({ error: 'link is required' });

    const item = await VideoGeoAd.create(body);
    res.status(201).json(item);
  } catch (e) {
    console.error('VideoGeoAd create failed:', e);
    res.status(500).json({ error: 'Failed to create video geo ad' });
  }
};

exports.update = async (req, res) => {
  try {
    const body = req.body || {};
    const item = await VideoGeoAd.findByIdAndUpdate(req.params.id, body, { new: true });
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (e) {
    console.error('VideoGeoAd update failed:', e);
    res.status(500).json({ error: 'Failed to update video geo ad' });
  }
};

exports.remove = async (req, res) => {
  try {
    await VideoGeoAd.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (e) {
    console.error('VideoGeoAd delete failed:', e);
    res.status(500).json({ error: 'Failed to delete video geo ad' });
  }
};
