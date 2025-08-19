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
    console.error("Error fetching topics:", err);
    res.status(500).json({ error: 'Failed to fetch topics' });
  }
};

exports.createTopic = async (req, res) => {
  try {
    const { title } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const topic = new LiveTopic({
      title: title.trim(),
      isActive: true,  // ✅ make new topics active by default
    });

    const saved = await topic.save();
    res.json(saved);
  } catch (err) {
    console.error("Error creating topic:", err);
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
    console.error("Error fetching entries:", err);
    res.status(500).json({ error: 'Failed to fetch entries' });
  }
};

exports.createEntry = async (req, res) => {
  try {
    const { topicId, summary, imageUrl, sourceName, linkUrl } = req.body;

    if (!topicId || !summary) {
      return res.status(400).json({ error: 'topicId and summary are required' });
    }

    const entry = new LiveEntry({
      topicId,
      summary: summary.trim(),
      imageUrl: imageUrl || "",
      sourceName: sourceName || "",
      linkUrl: linkUrl || "",
    });

    const saved = await entry.save();

    // ✅ Broadcast new entry to all SSE clients
    sse.broadcast('new-entry', saved);

    res.json(saved);
  } catch (err) {
    console.error("Error creating entry:", err);
    res.status(500).json({ error: 'Failed to create entry' });
  }
};
