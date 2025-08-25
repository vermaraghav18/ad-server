const mongoose = require('mongoose');

const XFeedBannerSchema = new mongoose.Schema(
  {
    title: { type: String, default: '' },          // label you show on the banner
    rssUrl: { type: String, required: true, trim: true },
    iconUrl: { type: String, default: '' },        // optional channel avatar/logo
    order: { type: Number, default: 0 },           // for deterministic rotation order
    enabled: { type: Boolean, default: true },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model('XFeedBanner', XFeedBannerSchema);
