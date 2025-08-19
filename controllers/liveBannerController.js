// controllers/liveBannerController.js
const LiveBanner = require('../models/liveBannerModel');

// ---------- Core CRUD ----------
exports.list = async (req, res) => {
  try {
    const items = await LiveBanner.find().sort({ updatedAt: -1 });
    res.json(items);
  } catch (e) {
    console.error('liveBanner list failed:', e);
    res.status(500).json({ error: 'Failed to fetch live banners' });
  }
};

exports.getOne = async (req, res) => {
  try {
    const doc = await LiveBanner.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Not found' });
    res.json(doc);
  } catch (e) {
    console.error('liveBanner getOne failed:', e);
    res.status(400).json({ error: 'Failed to fetch' });
  }
};

exports.create = async (req, res) => {
  try {
    const payload = sanitize(req.body);
    const created = await LiveBanner.create(payload);
    res.status(201).json(created);
  } catch (e) {
    console.error('liveBanner create failed:', e);
    res.status(400).json({ error: 'Failed to create live banner', details: e.message });
  }
};

exports.update = async (req, res) => {
  try {
    const payload = sanitize(req.body);
    const doc = await LiveBanner.findByIdAndUpdate(req.params.id, payload, { new: true });
    if (!doc) return res.status(404).json({ error: 'Not found' });
    res.json(doc);
  } catch (e) {
    console.error('liveBanner update failed:', e);
    res.status(400).json({ error: 'Failed to update live banner', details: e.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const out = await LiveBanner.findByIdAndDelete(req.params.id);
    if (!out) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (e) {
    console.error('liveBanner delete failed:', e);
    res.status(400).json({ error: 'Failed to delete live banner' });
  }
};

// ---------- Public feed ----------
exports.publicList = async (req, res) => {
  try {
    const { enabled } = req.query;
    const q = {};
    if (enabled === 'true') q.enabled = true;
    const items = await LiveBanner.find(q).sort({ placementIndex: 1, updatedAt: -1 });
    res.json(items);
  } catch (e) {
    console.error('liveBanner publicList failed:', e);
    res.status(500).json({ error: 'Failed to fetch live banners' });
  }
};

// ---------- Sections (Headings) ----------
exports.addSection = async (req, res) => {
  try {
    const { heading } = req.body;
    if (!heading) return res.status(400).json({ error: 'heading required' });

    const doc = await LiveBanner.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Not found' });

    doc.sections.push({ heading, articles: [] });
    await doc.save();
    res.json(doc);
  } catch (e) {
    console.error('addSection failed:', e);
    res.status(400).json({ error: 'Failed to add section' });
  }
};

exports.updateSection = async (req, res) => {
  try {
    const sIdx = Number(req.params.sIdx);
    const { heading } = req.body;

    const doc = await LiveBanner.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Not found' });
    if (Number.isNaN(sIdx) || sIdx < 0 || sIdx >= doc.sections.length) {
      return res.status(400).json({ error: 'Invalid section index' });
    }
    if (heading) doc.sections[sIdx].heading = heading;

    await doc.save();
    res.json(doc);
  } catch (e) {
    console.error('updateSection failed:', e);
    res.status(400).json({ error: 'Failed to update section' });
  }
};

exports.deleteSection = async (req, res) => {
  try {
    const sIdx = Number(req.params.sIdx);
    const doc = await LiveBanner.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Not found' });
    if (Number.isNaN(sIdx) || sIdx < 0 || sIdx >= doc.sections.length) {
      return res.status(400).json({ error: 'Invalid section index' });
    }
    doc.sections.splice(sIdx, 1);
    await doc.save();
    res.json(doc);
  } catch (e) {
    console.error('deleteSection failed:', e);
    res.status(400).json({ error: 'Failed to delete section' });
  }
};

// ---------- Articles inside a section ----------
exports.addArticle = async (req, res) => {
  try {
    const sIdx = Number(req.params.sIdx);
    const a = sanitizeArticle(req.body);

    const doc = await LiveBanner.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Not found' });
    if (Number.isNaN(sIdx) || sIdx < 0 || sIdx >= doc.sections.length) {
      return res.status(400).json({ error: 'Invalid section index' });
    }

    doc.sections[sIdx].articles.push(a);
    await doc.save();
    res.json(doc);
  } catch (e) {
    console.error('addArticle failed:', e);
    res.status(400).json({ error: 'Failed to add article' });
  }
};

exports.updateArticle = async (req, res) => {
  try {
    const sIdx = Number(req.params.sIdx);
    const aIdx = Number(req.params.aIdx);
    const patch = sanitizeArticle(req.body, { partial: true });

    const doc = await LiveBanner.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Not found' });
    if (invalidIdx(sIdx, doc.sections.length)) return res.status(400).json({ error: 'Invalid section index' });
    if (invalidIdx(aIdx, doc.sections[sIdx].articles.length)) return res.status(400).json({ error: 'Invalid article index' });

    Object.assign(doc.sections[sIdx].articles[aIdx], patch);
    await doc.save();
    res.json(doc);
  } catch (e) {
    console.error('updateArticle failed:', e);
    res.status(400).json({ error: 'Failed to update article' });
  }
};

exports.deleteArticle = async (req, res) => {
  try {
    const sIdx = Number(req.params.sIdx);
    const aIdx = Number(req.params.aIdx);

    const doc = await LiveBanner.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Not found' });
    if (invalidIdx(sIdx, doc.sections.length)) return res.status(400).json({ error: 'Invalid section index' });
    if (invalidIdx(aIdx, doc.sections[sIdx].articles.length)) return res.status(400).json({ error: 'Invalid article index' });

    doc.sections[sIdx].articles.splice(aIdx, 1);
    await doc.save();
    res.json(doc);
  } catch (e) {
    console.error('deleteArticle failed:', e);
    res.status(400).json({ error: 'Failed to delete article' });
  }
};

// ---------- helpers ----------
function invalidIdx(i, len) {
  return Number.isNaN(i) || i < 0 || i >= len;
}

function sanitize(b) {
  return {
    enabled:        !!b.enabled,
    placementIndex: Number(b.placementIndex ?? b.position ?? 1),
    headline:       (b.headline ?? b.title ?? '').toString(),
    mediaUrl:       (b.mediaUrl ?? '').toString(),
    sections: Array.isArray(b.sections) ? b.sections.map(s => ({
      heading: (s.heading ?? s.title ?? '').toString(),
      articles: Array.isArray(s.articles) ? s.articles.map(a => sanitizeArticle(a)) : [],
    })) : [],
  };
}

function sanitizeArticle(a, { partial = false } = {}) {
  const out = {};
  if (partial || a.imageUrl !== undefined)   out.imageUrl   = (a.imageUrl ?? a.image ?? '').toString();
  if (partial || a.type !== undefined)       out.type       = (a.type ?? 'news').toString();
  if (partial || a.title !== undefined)      out.title      = (a.title ?? '').toString();
  if (partial || a.description !== undefined)out.description= (a.description ?? '').toString();
  if (partial || a.sourceName !== undefined) out.sourceName = (a.sourceName ?? a.source ?? '').toString();
  if (partial || a.link !== undefined)       out.link       = (a.link ?? '').toString();
  return out;
}
