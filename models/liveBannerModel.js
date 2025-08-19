const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  image: { type: String },       // optional article image
  sourceName: { type: String },  // e.g., "BBC News"
  sourceLink: { type: String },  // actual URL of the article
}, { _id: false });

const liveBannerSchema = new mongoose.Schema({
  headline: { type: String, required: true }, // Main banner headline
  mediaUrl: { type: String, required: true }, // Banner image (Cloudinary URL)
  articles: { type: [articleSchema], default: [] } // Multiple articles per banner
}, { timestamps: true });

module.exports = mongoose.model('LiveBanner', liveBannerSchema);
