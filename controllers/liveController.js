// ad-server/controllers/liveController.js
const LiveTopic = require('../models/liveTopic');
const LiveEntry = require('../models/liveEntry');
const sse = require('../sse');

/* ----------------- TOPICS ----------------- */
exports.getTopics = async (req, res) => {
  try {
    const { onlyActive } = req.query;
    const filter = onlyActive ? { isActive: true } : {};
    const topics = await LiveTopic.find(filter).sort({ createdAt: -1 });
    res.json(topics);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch topics' });
  }
};

exports.createTopic = async (req, res) => {
  try {
    const topic = new LiveTopic(req.body);
    const saved = await topic.save();
    res.json(saved);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create topic' });
  }
};

/* ----------------- ENTRIES ----------------- */
exports.getEntries = async (req, res) => {
  try {
    const { topicId } = req.params;
    const entries = await LiveEntry.find({ topicId }).sort({ createdAt: -1 });
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch entries' });
  }
};

exports.createEntry = async (req, res) => {
  try {
    const entry = new LiveEntry(req.body);
    const saved = await entry.save();

    // Broadcast to all SSE clients
    sse.broadcast('new-entry', saved);

    res.json(saved);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create entry' });
  }
};
