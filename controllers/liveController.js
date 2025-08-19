// ad-server/controllers/liveController.js
const LiveTopic = require('../models/liveTopic');
const LiveEntry = require('../models/liveEntry');
const LiveBannerConfig = require('../models/liveBannerConfig');
const sse = require('../sse');
const { uploadBuffer } = require('../utils/cloudinary');

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
    const { topicId, summary, linkUrl, sourceName, ordinal } = req.body;
    if (!topicId || !summary || !linkUrl)
      return res.status(400).json({ error: 'topicId, summary, linkUrl are required' });

    let imageUrl = req.body.imageUrl || '';
    if (req.file) {
      // If file uploaded → upload to Cloudinary
      const result = await uploadBuffer(req.file.buffer, 'knotshorts/live/entries', {
        resource_type: 'image',
      });
      imageUrl = result.secure_url;
    }

    const entry = await LiveEntry.create({
      topicId,
      summary,
      linkUrl,
      sourceName,
      imageUrl,
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

    const fields = ['topicId', 'summary', 'linkUrl', 'sourceName', 'ordinal'];
    for (const f of fields) if (req.body[f] !== undefined) e[f] = req.body[f];

    if (req.file) {
      // Replace image with uploaded file
      const result = await uploadBuffer(req.file.buffer, 'knotshorts/live/entries', {
        resource_type: 'image',
      });
      e.imageUrl = result.secure_url;
    } else if (req.body.imageUrl !== undefined) {
      e.imageUrl = req.body.imageUrl;
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
    const data = { ...req.body };

    if (req.file) {
      // Auto-detect image vs video
      const isVideo = req.file.mimetype.startsWith('video/');
      const result = await uploadBuffer(
        req.file.buffer,
        'knotshorts/live/banners',
        { resource_type: isVideo ? 'video' : 'image' }
      );
      data.mediaUrl = result.secure_url;
      data.mediaType = isVideo ? 'video' : 'image';
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
