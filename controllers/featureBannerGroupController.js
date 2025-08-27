// controllers/featureBannerGroupController.js
const Group = require('../models/FeatureBannerGroup');

const isActive = (doc) => {
  const now = new Date();
  if (!doc.enabled) return false;
  if (doc.startAt && now < doc.startAt) return false;
  if (doc.endAt && now > doc.endAt) return false;
  return true;
};

exports.list = async (req, res) => {
  const docs = await Group.find().sort({ priority: -1, nth: 1, updatedAt: -1 });
  res.json(docs);
};

exports.listActive = async (req, res) => {
  const q = {};
  if (req.query.category) q.category = req.query.category;
  const docs = await Group.find(q).sort({ priority: -1, nth: 1, updatedAt: -1 });
  res.json(docs.filter(isActive));
};

exports.create = async (req, res) => {
  const doc = await Group.create(req.body);
  res.status(201).json(doc);
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const doc = await Group.findByIdAndUpdate(id, req.body, { new: true });
  if (!doc) return res.status(404).json({ error: 'Not found' });
  res.json(doc);
};

exports.remove = async (req, res) => {
  const { id } = req.params;
  await Group.findByIdAndDelete(id);
  res.json({ ok: true });
};
