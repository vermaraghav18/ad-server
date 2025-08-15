const CustomNews = require('../models/customNews');

exports.create = async (req, res) => {
  try {
    const { title, description, source } = req.body;
    const imageUrl = req.file?.secure_url || req.body.imageUrl;
    const item = await CustomNews.create({ title, description, source, imageUrl });
    res.status(201).json(item);
  } catch (e) { res.status(400).json({ error: e.message }); }
};

exports.list = async (_req, res) => {
  const items = await CustomNews.find({ isActive: true }).sort({ createdAt: -1 }).limit(50);
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
