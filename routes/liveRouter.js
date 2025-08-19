// ad-server/routes/liveRouter.js
const express = require("express");
const router = express.Router();
const LiveTopic = require("../models/liveTopic");
const LiveEntry = require("../models/liveEntry");
const sse = require("../sse");

/* ---------------- TOPICS ---------------- */

// Get all topics
router.get("/topics", async (_req, res) => {
  try {
    const topics = await LiveTopic.find().sort({ createdAt: -1 });
    res.json(topics);
  } catch (err) {
    console.error("Error fetching topics:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Create new topic
router.post("/topics", async (req, res) => {
  try {
    const { title } = req.body;
    if (!title) return res.status(400).json({ error: "Title required" });

    const topic = new LiveTopic({ title });
    await topic.save();

    sse.broadcast("topicCreated", topic);
    res.json(topic);
  } catch (err) {
    console.error("Error creating topic:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Toggle active/inactive
router.patch("/topics/:id/toggle", async (req, res) => {
  try {
    const topic = await LiveTopic.findById(req.params.id);
    if (!topic) return res.status(404).json({ error: "Not found" });

    topic.isActive = !topic.isActive;
    await topic.save();

    sse.broadcast("topicToggled", topic);
    res.json(topic);
  } catch (err) {
    console.error("Error toggling topic:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- ENTRIES ---------------- */

// Get entries for a topic
// ✅ use query param ?topicId=xyz
router.get("/entries", async (req, res) => {
  try {
    const { topicId } = req.query;
    if (!topicId) return res.status(400).json({ error: "topicId required" });

    const entries = await LiveEntry.find({ topicId }).sort({ createdAt: -1 });
    res.json(entries);
  } catch (err) {
    console.error("Error fetching entries:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Create new entry
router.post("/entries", async (req, res) => {
  try {
    const { topicId, summary, imageUrl, sourceName, linkUrl } = req.body;
    if (!topicId || !summary)
      return res.status(400).json({ error: "topicId and summary required" });

    const entry = new LiveEntry({
      topicId,
      summary,
      imageUrl,
      sourceName,
      linkUrl,
    });

    await entry.save();

    sse.broadcast("entryCreated", entry);
    res.json(entry);
  } catch (err) {
    console.error("Error creating entry:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
