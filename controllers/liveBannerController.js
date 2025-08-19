const LiveBanner = require('../models/liveBannerModel');
const { uploadBuffer } = require('../utils/cloudinary');

// list
exports.list = async (_req, res, next) => {
  try { res.json(await LiveBanner.find().sort({ createdAt: -1 })); }
  catch (e) { next(e); }
};

// create (no media here)
exports.create = async (req, res, next) => {
  try {
    const { enabled=false, placementIndex=1, headline='', mediaUrl='', sections=[] } = req.body || {};
    const doc = await LiveBanner.create({ enabled, placementIndex, headline, mediaUrl, sections });
    res.status(201).json(doc);
  } catch (e) { next(e); }
};

exports.patch = async (req, res, next) => {
  try {
    const doc = await LiveBanner.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!doc) return res.status(404).json({ error: 'not found' });
    res.json(doc);
  } catch (e) { next(e); }
};

exports.remove = async (req, res, next) => {
  try {
    await LiveBanner.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
};

// 👇 NEW: upload media (image/video) to Cloudinary and save URL
exports.uploadMedia = async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!req.file) return res.status(400).json({ error: 'media file required' });
    const isVideo = /^video\//i.test(req.file.mimetype);
    const result = await uploadBuffer(
      req.file.buffer,
      'knotshorts/live',
      { resource_type: isVideo ? 'video' : 'image' }
    );
    const doc = await LiveBanner.findByIdAndUpdate(
      id,
      { mediaUrl: result.secure_url },
      { new: true }
    );
    if (!doc) return res.status(404).json({ error: 'not found' });
    res.json(doc);
  } catch (e) { next(e); }
};

// ---- Sections
exports.addSection = async (req, res, next) => {
  try {
    const { heading='' } = req.body || {};
    const doc = await LiveBanner.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'not found' });
    doc.sections.push({ heading, articles: [] });
    await doc.save();
    res.json(doc);
  } catch (e) { next(e); }
};
exports.updateSection = async (req, res, next) => {
  try {
    const { heading='' } = req.body || {};
    const doc = await LiveBanner.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'not found' });
    const s = doc.sections[req.params.sIdx];
    if (!s) return res.status(404).json({ error: 'section not found' });
    s.heading = heading;
    await doc.save();
    res.json(doc);
  } catch (e) { next(e); }
};
exports.deleteSection = async (req, res, next) => {
  try {
    const doc = await LiveBanner.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'not found' });
    doc.sections.splice(req.params.sIdx, 1);
    await doc.save();
    res.json(doc);
  } catch (e) { next(e); }
};

// ---- Articles
exports.addArticle = async (req, res, next) => {
  try {
    const doc = await LiveBanner.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'not found' });
    const s = doc.sections[req.params.sIdx];
    if (!s) return res.status(404).json({ error: 'section not found' });
    s.articles.push(req.body || {});
    await doc.save();
    res.json(doc);
  } catch (e) { next(e); }
};
exports.updateArticle = async (req, res, next) => {
  try {
    const doc = await LiveBanner.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'not found' });
    const s = doc.sections[req.params.sIdx];
    if (!s) return res.status(404).json({ error: 'section not found' });
    Object.assign(s.articles[req.params.aIdx], req.body || {});
    await doc.save();
    res.json(doc);
  } catch (e) { next(e); }
};
exports.deleteArticle = async (req, res, next) => {
  try {
    const doc = await LiveBanner.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'not found' });
    const s = doc.sections[req.params.sIdx];
    if (!s) return res.status(404).json({ error: 'section not found' });
    s.articles.splice(req.params.aIdx, 1);
    await doc.save();
    res.json(doc);
  } catch (e) { next(e); }
};
