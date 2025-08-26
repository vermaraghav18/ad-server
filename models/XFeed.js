// models/XFeed.js
const mongoose = require('mongoose');

const XFeedSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    url:  { type: String, required: true },
    enabled: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    lang: { type: String, default: 'en' }, // preferred language of feed
  },
  { timestamps: true }
);

module.exports = mongoose.model('XFeed', XFeedSchema);
