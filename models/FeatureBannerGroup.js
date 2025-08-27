// models/FeatureBannerGroup.js
const mongoose = require('mongoose');

const Item = new mongoose.Schema({
  id: String,
  title: String,
  description: String,
  imageUrl: String,
  link: String,
  source: String,
  publishedAt: Date,
});

const FeatureBannerGroupSchema = new mongoose.Schema({
  name: { type: String, default: '' },
  category: { type: String, required: true },      // e.g. "Sports"
  nth: { type: Number, required: true, min: 1 },   // 1-based insertion index
  priority: { type: Number, default: 0 },          // higher first
  enabled: { type: Boolean, default: true },
  startAt: Date,
  endAt: Date,
  items: { type: [Item], default: [] },            // 1+ articles
}, { timestamps: true });

module.exports = mongoose.model('FeatureBannerGroup', FeatureBannerGroupSchema);
