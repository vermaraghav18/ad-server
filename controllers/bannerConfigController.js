// controllers/bannerConfigController.js
const BannerConfig = require('../models/BannerConfig');

exports.create = async (req, res) => {
  try {
    const payload = sanitize(req.body);
    const doc = await BannerConfig.create(payload);
    res.status(201).json(doc);
  } catch (e) {
    console.error('[banner-config.create] error:', e);
    res.status(400).json({ error: e.message });
  }
};

exports.list = async (_req, res) => {
  const docs = await BannerConfig.find({}).sort({ createdAt: -1 });
  res.json(docs);
};

// List only active + within date window.
// (Flutter app should call this endpoint)
exports.listActive = async (_req, res) => {
  const now = new Date();

  const docs = await BannerConfig.find({
    isActive: true,
    $and: [
      { $or: [{ activeFrom: { $exists: false } }, { activeFrom: null }, { activeFrom: { $lte: now } }] },
      { $or: [{ activeTo:   { $exists: false } }, { activeTo: null },   { activeTo:   { $gte: now } }] },
    ],
  })
    .sort({ priority: 1, startAfter: 1 }) // lower priority first
    .lean();

  res.json(docs);
};

exports.get = async (req, res) => {
  const doc = await BannerConfig.findById(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Not found' });
  res.json(doc);
};

exports.update = async (req, res) => {
  try {
    const updates = sanitize(req.body);
    // runValidators ensures mode-specific requirements are checked
    const doc = await BannerConfig.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });
    if (!doc) return res.status(404).json({ error: 'Not found' });
    res.json(doc);
  } catch (e) {
    console.error('[banner-config.update] error:', e);
    res.status(400).json({ error: e.message });
  }
};

exports.remove = async (req, res) => {
  await BannerConfig.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
};

function sanitize(src = {}) {
  // Only allow known fields
  const {
    mode,
    startAfter,
    repeatEvery,
    priority,
    isActive,
    activeFrom,
    activeTo,
    imageUrl,
    customNewsId,
    message,
  } = src;

  const out = {
    ...(mode !== undefined ? { mode } : {}),
    ...(startAfter !== undefined ? { startAfter: toInt(startAfter) } : {}),
    ...(repeatEvery !== undefined ? { repeatEvery: repeatEvery === null || repeatEvery === '' ? null : toInt(repeatEvery) } : {}),
    ...(priority !== undefined ? { priority: toInt(priority) } : {}),
    ...(isActive !== undefined ? { isActive: !!isActive } : {}),
    ...(activeFrom ? { activeFrom: toDate(activeFrom) } : activeFrom === null ? { activeFrom: null } : {}),
    ...(activeTo   ? { activeTo:   toDate(activeTo) }   : activeTo   === null ? { activeTo: null }   : {}),
    ...(imageUrl !== undefined ? { imageUrl } : {}),
    ...(customNewsId !== undefined ? { customNewsId } : {}),
    ...(message !== undefined ? { message } : {}),
  };

  return out;
}

function toInt(v) {
  const n = typeof v === 'string' ? parseInt(v, 10) : v;
  if (Number.isNaN(n)) return undefined;
  return n;
}

function toDate(v) {
  const d = new Date(v);
  return isNaN(+d) ? undefined : d;
}
