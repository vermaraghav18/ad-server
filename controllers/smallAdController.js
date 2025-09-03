// ad-server/controllers/smallAdController.js
const SmallAd = require('../models/smallAd');
const cloudinary = require('../utils/cloudinary'); // v2 instance (fixed earlier)
const fs = require('fs');

function inferType(mime) {
  if (!mime) return null;
  if (mime.startsWith('image/')) return 'image';
  if (mime === 'video/mp4') return 'video';
  return null;
}

exports.getAll = async (req, res) => {
  try {
    // Optional filter: ?enabled=true
    const enabled = req.query.enabled === 'false' ? undefined : true;
    const query = enabled === true ? { enabled: true } : {};
    const docs = await SmallAd.find(query)
      .sort({ placementIndex: 1, sortIndex: 1, createdAt: 1 });
    res.json(docs);
  } catch (err) {
    console.error('❌ SmallAds getAll error:', err);
    res.status(500).json({ message: 'Failed to fetch small ads' });
  }
};

exports.create = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "File is required (field: 'media')." });
    }

    const kind = inferType(req.file.mimetype);
    if (!kind) {
      return res.status(400).json({ message: 'Unsupported file type. Use image/* or video/mp4.' });
    }

    const placementIndex = Math.max(1, parseInt(req.body.placementIndex, 10) || 1);
    // 🔽 NEW
    const repeatEvery = Math.max(0, parseInt(req.body.repeatEvery, 10) || 0);
    const repeatCount = Math.max(0, parseInt(req.body.repeatCount, 10) || 0);
    const targetUrl = (req.body.targetUrl || '').trim();
    const enabled = String(req.body.enabled ?? 'true') === 'true';

    const folder = 'knotshorts/small-ads';
    const upload = await cloudinary.uploader.upload(req.file.path, {
      folder,
      resource_type: kind === 'video' ? 'video' : 'image',
    });

    // best-effort cleanup
    try { fs.unlinkSync(req.file.path); } catch {}

    const doc = await SmallAd.create({
      mediaUrl: upload.secure_url,
      mediaType: kind,
      width: Number(upload.width) || undefined,
      height: Number(upload.height) || undefined,
      placementIndex,
      targetUrl,
      enabled,
      sortIndex: 0,
      // 🔽 NEW
      repeatEvery,
      repeatCount,
    });

    res.status(201).json(doc);
  } catch (err) {
    console.error('❌ SmallAds create error:', err);
    res.status(400).json({ message: 'Failed to create small ad', error: String(err.message || err) });
  }
};

// 🔽 NEW: update only the repeat fields (no media upload)
exports.update = async (req, res) => {
  try {
    const id = req.params.id;

    const patch = {};
    if (req.body.repeatEvery != null) {
      const n = Math.max(0, parseInt(req.body.repeatEvery, 10) || 0);
      patch.repeatEvery = n;
    }
    if (req.body.repeatCount != null) {
      const n = Math.max(0, parseInt(req.body.repeatCount, 10) || 0);
      patch.repeatCount = n;
    }

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ message: 'Nothing to update' });
    }

    const doc = await SmallAd.findByIdAndUpdate(id, patch, { new: true });
    if (!doc) return res.status(404).json({ message: 'Not found' });
    res.json(doc);
  } catch (err) {
    console.error('❌ SmallAds update error:', err);
    res.status(500).json({ message: 'Failed to update small ad' });
  }
};

exports.delete = async (req, res) => {
  try {
    await SmallAd.findByIdAndDelete(req.params.id);
    res.sendStatus(204);
  } catch (err) {
    console.error('❌ SmallAds delete error:', err);
    res.status(500).json({ message: 'Failed to delete small ad' });
  }
};
