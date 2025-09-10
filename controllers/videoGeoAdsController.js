// controllers/videoGeoAdsController.js
const VideoGeoAd = require('../models/VideoGeoAd');

function toStr(v, d = '') {
  return typeof v === 'string' ? v : (v == null ? d : String(v));
}
function toArr(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v.map((x) => String(x));
  if (typeof v === 'string') {
    const t = v.trim();
    if (!t) return [];
    try {
      const j = JSON.parse(t);
      if (Array.isArray(j)) return j.map((x) => String(x));
    } catch {}
    return t.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

exports.list = async (req, res) => {
  try {
    const { enabled } = req.query;
    const q = {};
    if (enabled === 'true') q.enabled = true;
    if (enabled === 'false') q.enabled = false;

    // Optional future filters:
    // if (req.query.category) q.categories = { $in: [String(req.query.category).toLowerCase()] };
    // if (req.query.state) q.states = { $in: [String(req.query.state)] };
    // if (req.query.city) q.cities = { $in: [String(req.query.city)] };

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
    const doc = {
      title: toStr(body.title),
      description: toStr(body.description),

      link: toStr(body.link),
      videoUrl: toStr(body.videoUrl),
      posterUrl: toStr(body.posterUrl),
      mime: toStr(body.mime),

      cities: toArr(body.cities),
      states: toArr(body.states),

      // ✅ NEW
      categories: toArr(body.categories).map((s) => s.toLowerCase()),

      afterNth: Number(body.afterNth ?? 1),
      repeatEvery: Number(body.repeatEvery ?? 0),
      repeatCount: Number(body.repeatCount ?? 0),
      enabled: body.enabled !== false,
    };

    if (!doc.videoUrl) return res.status(400).json({ error: 'videoUrl is required' });
    if (!doc.link) return res.status(400).json({ error: 'link is required' });

    const item = await VideoGeoAd.create(doc);
    res.status(201).json(item);
  } catch (e) {
    console.error('VideoGeoAd create failed:', e);
    res.status(500).json({ error: 'Failed to create video geo ad' });
  }
};

exports.update = async (req, res) => {
  try {
    const body = req.body || {};
    const patch = {
      title: body.title !== undefined ? toStr(body.title) : undefined,
      description: body.description !== undefined ? toStr(body.description) : undefined,

      link: body.link !== undefined ? toStr(body.link) : undefined,
      videoUrl: body.videoUrl !== undefined ? toStr(body.videoUrl) : undefined,
      posterUrl: body.posterUrl !== undefined ? toStr(body.posterUrl) : undefined,
      mime: body.mime !== undefined ? toStr(body.mime) : undefined,

      cities: body.cities !== undefined ? toArr(body.cities) : undefined,
      states: body.states !== undefined ? toArr(body.states) : undefined,

      // ✅ NEW
      categories: body.categories !== undefined
        ? toArr(body.categories).map((s) => s.toLowerCase())
        : undefined,

      afterNth: body.afterNth !== undefined ? Number(body.afterNth) : undefined,
      repeatEvery: body.repeatEvery !== undefined ? Number(body.repeatEvery) : undefined,
      repeatCount: body.repeatCount !== undefined ? Number(body.repeatCount) : undefined,
      enabled: body.enabled !== undefined ? !!body.enabled : undefined,
    };
    Object.keys(patch).forEach((k) => patch[k] === undefined && delete patch[k]);

    const item = await VideoGeoAd.findByIdAndUpdate(req.params.id, patch, { new: true });
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
