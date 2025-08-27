// controllers/featureBannerGroupController.js
const FeatureBannerGroup = require('../models/FeatureBannerGroup');

// Coerce some fields from request body
function normalizePayload(body = {}) {
  const nth = Number(body.nth ?? 0);
  const priority = Number(body.priority ?? 0);

  const normalized = {
    name: String(body.name ?? '').trim(),
    category: String(body.category ?? '').trim(),
    nth: Number.isFinite(nth) ? nth : 0,
    priority: Number.isFinite(priority) ? priority : 0,
    enabled: body.enabled !== false && body.enabled !== 'false',
    articleKey: String(body.articleKey ?? '').trim(),   // ✅ NEW
    startsAt: body.startsAt ? new Date(body.startsAt) : undefined,
    endsAt:   body.endsAt   ? new Date(body.endsAt)   : undefined,
    items: Array.isArray(body.items) ? body.items.map(it => ({
      title: String(it.title ?? '').trim(),
      link: String(it.link ?? '').trim(),
      imageUrl: String(it.imageUrl ?? '').trim(),
      description: String(it.description ?? '').trim(), // ✅ NEW
      pubDate: it.pubDate ? new Date(it.pubDate) : undefined,
    })) : [],
  };

  // Remove undefined so $set does not overwrite with undefined
  Object.keys(normalized).forEach(k => normalized[k] === undefined && delete normalized[k]);
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

    const baseMatch = {
      enabled: true,
      ...(category ? { category } : {}),
    };

    const docs = await FeatureBannerGroup
      .find(baseMatch)
      .sort({ priority: -1, nth: 1, updatedAt: -1 });

    const filtered = docs.filter(d =>
      (!d.startsAt || d.startsAt <= now) &&
      (!d.endsAt   || d.endsAt   >= now)
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
    const payload = normalizePayload(req.body);

    const doc = await FeatureBannerGroup.findByIdAndUpdate(
      id,
      { $set: payload },
      { new: true }
    );
    if (!doc) return res.status(404).json({ error: 'Not found' });
    res.json(doc);
  } catch (e) { next(e); }
}

// DELETE /api/feature-banner-groups/:id
async function remove(req, res, next) {
  try {
    const { id } = req.params;
    const doc = await FeatureBannerGroup.findByIdAndDelete(id);
    if (!doc) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (e) { next(e); }
}

module.exports = {
  list,
  listActiveByCategory,
  create,
  update,
  remove,
};
