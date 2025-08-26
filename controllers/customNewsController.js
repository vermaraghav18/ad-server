const CustomNews = require('../models/customNews');

exports.create = async (req, res) => {
  try {
    const { title, description, source, topic = '' } = req.body;
    const imageUrl = req.file?.secure_url || req.body.imageUrl;

    if (!title || !description || !source) {
      return res.status(400).json({ error: 'title, description, source are required' });
    }
    if (!imageUrl) {
      return res.status(400).json({ error: 'image or imageUrl is required' });
    }

    const item = await CustomNews.create({ title, description, source, imageUrl, topic });
    res.status(201).json(item);
  } catch (e) {
    console.error('[custom-news.create] error:', e);
    res.status(400).json({ error: e.message });
  }
};

exports.list = async (req, res) => {
  const { topic } = req.query;
  const q = { isActive: true };
  if (topic && String(topic).trim()) {
    // case-insensitive exact match
    q.topic = new RegExp(`^${String(topic).trim()}$`, 'i');
  }
  const items = await CustomNews.find(q).sort({ createdAt: -1 }).limit(50);
  res.json(items);
};

exports.get = async (req, res) => {
  const item = await CustomNews.findById(req.params.id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
};

exports.update = async (req, res) => {
  const updates = { ...req.body };
  if (req.file?.secure_url) updates.imageUrl = req.file.secure_url;
  const item = await CustomNews.findByIdAndUpdate(req.params.id, updates, { new: true });
  res.json(item);
};

exports.remove = async (req, res) => {
  await CustomNews.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
};
