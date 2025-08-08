// models/feed.js
const mongoose = require('mongoose');

const feedSchema = new mongoose.Schema({
  label: { type: String, required: true },     // e.g., "Top News", "Finance"
  url: { type: String, required: true },       // RSS feed URL
  language: { type: String, default: 'en' },   // Optional, e.g., "en", "hi"
  enabled: { type: Boolean, default: true },   // Toggle to enable/disable feed
  category: { type: String },                  // Optional, for grouping tabs

  // ✅ NEW: Optional filters for regional feeds
  state: { type: String },                     // Optional state filter
  city: { type: String },                      // Optional city filter
}, {
  timestamps: true
});

module.exports = mongoose.model('Feed', feedSchema);
