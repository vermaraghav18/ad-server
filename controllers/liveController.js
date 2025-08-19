// ad-server/controllers/liveController.js
const path = require('path');
const LiveTopic = require('../models/liveTopic');
const LiveEntry = require('../models/liveEntry');
const LiveBannerConfig = require('../models/liveBannerConfig');
const sse = require('../sse');

// ---------- Topics ----------
exports.createTopic = async (req, res) => {
  try {
    const { title, isActive } = req.body;
    if (!title) return res.status(400).json({ error: 'title is required' });

    const topic = await LiveTopic.create({ title, isActive });
    sse.broadcast('topic_created', topic);
    res.json(topic);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};

exports.listTopics = async (req, res) => {
  const { active } = req.query;
  const q = {};
  if (active === 'true') q.isActive = true;
  if (active === 'false') q.isActive = false;
  const topics = await LiveTopic.find(q).sort({ updatedAt: -1 }).lean();
  res.json(topics);
};

exports.getTopic = async (req, res) => {
  const t = await LiveTopic.findById(req.params.id).lean();
  if (!t) return res.status(404).json({ error: 'not found' });
  res.json(t);
};

exports.updateTopic = async (req, res) => {
  try {
    const { title, isActive } = req.body;
    const t = await LiveTopic.findById(req.params.id);
    if (!t) return res.status(404).json({ error: 'not found' });
    if (title !== undefined) t.title = title;
    if (isActive !== undefined) t.isActive = !!isActive;
    await t.save();
    sse.broadcast('topic_updated', t);
    res.json(t);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};

exports.deleteTopic = async (req, res) => {
  const t = await LiveTopic.findByIdAndDelete(req.params.id);
  if (!t) return res.status(404).json({ error: 'not found' });
  sse.broadcast('topic_deleted', { _id: t._id });
  await LiveEntry.deleteMany({ topicId: t._id }); // clean up entries
  res.json({ ok: true });
};

// ---------- Entries ----------
exports.createEntry = async (req, res) => {
  try {
    const { topicId, summary, linkUrl, sourceName, imageUrl, ordinal } = req.body;
    if (!topicId || !summary || !linkUrl)
      return res.status(400).json({ error: 'topicId, summary, linkUrl are required' });

    // ✅ Use uploaded file if available
    let finalMediaUrl = imageUrl;
    if (req.file) {
      finalMediaUrl = `/uploads/live/${req.file.filename}`;
    }

    const entry = await LiveEntry.create({
      topicId,
      summary,
      linkUrl,
      sourceName,
      imageUrl: finalMediaUrl,
      ordinal,
    });
    sse.broadcast('entry_created', entry);
    res.json(entry);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};

exports.listEntries = async (req, res) => {
  const { topicId, limit = 50, offset = 0 } = req.query;
  const q = topicId ? { topicId } : {};
  const items = await LiveEntry.find(q)
    .sort({ ordinal: 1, createdAt: -1 })
    .skip(Number(offset))
    .limit(Math.min(Number(limit), 100))
    .lean();
  res.json(items);
};

exports.updateEntry = async (req, res) => {
  try {
    const e = await LiveEntry.findById(req.params.id);
    if (!e) return res.status(404).json({ error: 'not found' });

    const fields = ['topicId', 'summary', 'linkUrl', 'sourceName', 'imageUrl', 'ordinal'];
    for (const f of fields) {
      if (req.body[f] !== undefined) e[f] = req.body[f];
    }

    // ✅ Replace media if new file uploaded
    if (req.file) {
      e.imageUrl = `/uploads/live/${req.file.filename}`;
    }

    await e.save();
    sse.broadcast('entry_updated', e);
    res.json(e);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deleteEntry = async (req, res) => {
  const e = await LiveEntry.findByIdAndDelete(req.params.id);
  if (!e) return res.status(404).json({ error: 'not found' });
  sse.broadcast('entry_deleted', { _id: e._id, topicId: e.topicId });
  res.json({ ok: true });
};

// ---------- Banner ----------
exports.getBanner = async (_req, res) => {
  const cfg = await LiveBannerConfig.findOne().lean();
  res.json(cfg || {});
};

exports.updateBanner = async (req, res) => {
  try {
    const data = req.body || {};

    // ✅ Allow banner media upload too
    if (req.file) {
      data.imageUrl = `/uploads/live/${req.file.filename}`;
    }

    const cfg = await LiveBannerConfig.findOneAndUpdate({}, data, {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    });
    sse.broadcast('banner_updated', cfg);
    res.json(cfg);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};
