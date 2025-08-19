// models/liveBannerModel.js
const mongoose = require('mongoose');

const ArticleSchema = new mongoose.Schema({
  title: { type: String, required: false }, // 👈 not required anymore
  url: String,
  image: String,
});

const SectionSchema = new mongoose.Schema({
  heading: String,
  articles: [ArticleSchema],
});

const LiveBannerSchema = new mongoose.Schema({
  headline: String,
  placementIndex: Number,
  enabled: { type: Boolean, default: false },
  mediaUrl: String,
  sections: [SectionSchema],
});

module.exports = mongoose.model('LiveBanner', LiveBannerSchema);
