// controllers/feedController.js
const Feed = require('../models/feed');

// ✅ GET all enabled feeds with optional state/city filtering
exports.getAllFeeds = async (req, res) => {
  try {
    const { state, city } = req.query;

    // Build query dynamically
    const query = { enabled: true };

    if (state) query.state = state;
    if (city) query.city = city;

    const feeds = await Feed.find(query);
    res.json(feeds);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET all feeds (admin view)
exports.getAllFeedsAdmin = async (req, res) => {
  try {
    const feeds = await Feed.find();
    res.json(feeds);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ POST create a new feed (accept state & city)
exports.createFeed = async (req, res) => {
  try {
    const {
      label,
      url,
      language,
      category,
      state,   // ✅ Optional
      city     // ✅ Optional
    } = req.body;

    const newFeed = new Feed({ label, url, language, category, state, city });
    await newFeed.save();
    res.status(201).json(newFeed);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// ✅ PUT update a feed (state & city supported)
exports.updateFeed = async (req, res) => {
  try {
    const updated = await Feed.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// DELETE a feed
exports.deleteFeed = async (req, res) => {
  try {
    await Feed.findByIdAndDelete(req.params.id);
    res.json({ message: 'Feed deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
