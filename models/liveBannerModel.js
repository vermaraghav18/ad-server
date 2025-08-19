const mongoose = require('mongoose');

const liveBannerSchema = new mongoose.Schema(
  {
    imageUrl: { type: String, required: true },
    position: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('LiveBanner', liveBannerSchema);
