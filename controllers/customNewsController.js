// controllers/customNewsController.js
const CustomNews = require('../models/customNews');

/** Normalize topic to a consistent, case-insensitive key */
function normalizeTopic(v) {
  if (v == null) return '';
  const t = String(v).trim().toLowerCase();
  return t;
}

/**
 * POST /api/custom-news
 * Body: { title, description, source, imageUrl?, topic?, isActive? }
 * (or multipart with req.file.secure_url)
 */
exports.create = async (req, res) => {
  try {
    const { title, description, source } = req.body;
    const topic = normalizeTopic(req.body.topic);
    const isActive =
      typeof req.body.isActive === 'boolean' ? req.body.isActive : true;

    const imageUrl = req.file?.secure_url || req.body.imageUrl;

    if (!title || !description || !source) {
      return res
        .status(400)
        .json({ error: 'title, description, source are required' });
    }
    if (!imageUrl) {
      return res
        .status(400)
        .json({ error: 'image or imageUrl is required' });
    }

    const item = await CustomNews.create({
      title,
      description,
      source,
      imageUrl,
      topic,
      isActive,
    });

    res.status(201).json(item);
  } catch (e) {
    console.error('[custom-news.create] error:', e);
    res.status(400).json({ error: e.message });
  }
};

/**
 * GET /api/custom-news?topic=cricket
 * Returns active items; if topic present, filter (case-insensitive).
 */
exports.list = async (req, res) => {
  try {
    const t = normalizeTopic(req.query.topic);
    const q = { isActive: true };

    if (t) {
      // Prefer exact normalized match; also match legacy mixed-case rows
      q.$or = [{ topic: t }, { topic: new RegExp(`^${t}$`, 'i') }];
    }

    const items = await CustomNews.find(q)
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(items);
  } catch (e) {
    console.error('[custom-news.list] error:', e);
    res.status(500).json({ error: 'Failed to list custom news' });
  }
};

/**
 * GET /api/custom-news/:id
 */
exports.get = async (req, res) => {
  try {
    const item = await CustomNews.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (e) {
    console.error('[custom-news.get] error:', e);
    res.status(400).json({ error: 'Invalid id' });
  }
};

/**
 * PUT /api/custom-news/:id
 * Body can include partial fields; supports new image via req.file.secure_url
 */
exports.update = async (req, res) => {
  try {
    const updates = { ...req.body };

    if (req.file?.secure_url) {
      updates.imageUrl = req.file.secure_url;
    }

    if (typeof updates.topic === 'string') {
      updates.topic = normalizeTopic(updates.topic);
    }

    if (typeof updates.isActive !== 'undefined') {
      updates.isActive = !!updates.isActive;
    }

    const item = await CustomNews.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true }
    );

    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (e) {
    console.error('[custom-news.update] error:', e);
    res.status(400).json({ error: e.message });
  }
};

/**
 * DELETE /api/custom-news/:id
 */
exports.remove = async (req, res) => {
  try {
    const r = await CustomNews.findByIdAndDelete(req.params.id);
    if (!r) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (e) {
    console.error('[custom-news.remove] error:', e);
    res.status(400).json({ error: e.message });
  }
};
