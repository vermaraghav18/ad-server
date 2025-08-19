const mongoose = require('mongoose');

const liveBannerSchema = new mongoose.Schema({
  imageUrl: { type: String, required: true },
  position: { type: Number, required: true }, // nth card position
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('LiveBanner', liveBannerSchema);
