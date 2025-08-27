// controllers/featureBannerGroupController.js
const mongoose = require('mongoose');
const FeatureBannerGroup = require('../models/FeatureBannerGroup');

function toDateOrUndef(v) {
  if (!v) return undefined;
  const d = new Date(v);
  return isNaN(d.getTime()) ? undefined : d;
}

// Coerce & sanitize incoming body
function normalizePayload(body = {}) {
  const nth = Number(body.nth ?? 0);
  const priority = Number(body.priority ?? 0);

  // Accept BOTH startAt/endAt and startsAt/endsAt from the client
  const startsAtRaw = body.startsAt ?? body.startAt;
  const endsAtRaw   = body.endsAt   ?? body.endAt;

  const normalized = {
    name: String(body.name ?? '').trim(),
    category: String(body.category ?? '').trim(),
    nth: Number.isFinite(nth) ? nth : 0,
    priority: Number.isFinite(priority) ? priority : 0,
    enabled: body.enabled !== false && body.enabled !== 'false',
    articleKey: String(body.articleKey ?? '').trim(),   // NEW
    startsAt: toDateOrUndef(startsAtRaw),
    endsAt:   toDateOrUndef(endsAtRaw),
    items: Array.isArray(body.items)
      ? body.items.map((it) => ({
          title: String(it.title ?? '').trim(),
          link: String(it.link ?? '').trim(),
          imageUrl: String(it.imageUrl ?? '').trim(),
          description: String(it.description ?? '').trim(), // NEW
          pubDate: toDateOrUndef(it.pubDate),
        }))
      : [],
  };

  // strip undefined so $set doesn't overwrite fields with undefined
  Object.keys(normalized).forEach((k) => {
    if (normalized[k] === undefined) delete normalized[k];
  });

  return normalized;
}

// GET /api/feature-banner-groups
async function list(req, res, next) {
  try {
    const docs = await FeatureBannerGroup.find().sort({ updatedAt: -1 });
    res.json(docs);
  } catch (e) { next(e); }
}

// GET /api/feature-banner-groups/active?category=Top%20News
async function listActiveByCategory(req, res, next) {
  try {
    const category = (req.query.category || req.query.cat || '').trim();
    const now = new Date();

    const match = { enabled: true, ...(category ? { category } : {}) };

    const docs = await FeatureBannerGroup
      .find(match)
      .sort({ priority: -1, nth: 1, updatedAt: -1 });

    const filtered = docs.filter(
      (d) => (!d.startsAt || d.startsAt <= now) && (!d.endsAt || d.endsAt >= now)
    );

    res.json(filtered);
  } catch (e) { next(e); }
}

// POST /api/feature-banner-groups
async function create(req, res, next) {
  try {
    const payload = normalizePayload(req.body);
    if (!payload.name || !payload.category) {
      return res.status(400).json({ error: 'name and category are required' });
    }
    const doc = await FeatureBannerGroup.create(payload);
    res.status(201).json(doc);
  } catch (e) { next(e); }
}

// PUT /api/feature-banner-groups/:id
async function update(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    const payload = normalizePayload(req.body);
    const doc = await FeatureBannerGroup.findByIdAndUpdate(id, { $set: payload }, { new: true });
    if (!doc) return res.status(404).json({ error: 'Not found' });
    res.json(doc);
  } catch (e) { next(e); }
}

// DELETE /api/feature-banner-groups/:id
async function remove(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    const doc = await FeatureBannerGroup.findByIdAndDelete(id);
    if (!doc) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (e) { next(e); }
}

module.exports = { list, listActiveByCategory, create, update, remove };
