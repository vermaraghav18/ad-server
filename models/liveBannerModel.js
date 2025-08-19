// models/liveBannerModel.js
const mongoose = require('mongoose');

const LiveBannerArticleSchema = new mongoose.Schema({
  imageUrl:   { type: String, default: '' },
  type:       { type: String, default: 'news' },
  title:      { type: String, required: true },
  description:{ type: String, default: '' },
  sourceName: { type: String, default: '' },
  link:       { type: String, default: '' },
}, { _id: false });

const LiveBannerSectionSchema = new mongoose.Schema({
  heading:  { type: String, required: true },
  articles: { type: [LiveBannerArticleSchema], default: [] },
}, { _id: false });

const LiveBannerSchema = new mongoose.Schema({
  enabled:        { type: Boolean, default: false },
  placementIndex: { type: Number, default: 1 },  // after Nth card
  headline:       { type: String, required: true },
  mediaUrl:       { type: String, default: '' }, // optional hero image
  sections:       { type: [LiveBannerSectionSchema], default: [] },
}, { timestamps: true });

module.exports = mongoose.model('LiveBanner', LiveBannerSchema);
