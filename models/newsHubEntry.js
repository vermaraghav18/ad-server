// ad-server/models/newsHubEntry.js
const mongoose = require('mongoose');

const ensureHttp = (u) => {
  if (!u) return '';
  const s = String(u).trim();
  if (!s) return '';
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
};

const NewsHubEntrySchema = new mongoose.Schema(
  {
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'NewsHubSection',
      required: true,
      index: true,
    },
    imageUrl:   { type: String, required: true, trim: true },
    title:      { type: String, required: true, trim: true },
    description:{ type: String, required: true, trim: true },

    // 🔧 Make it required; trim + validate; store with scheme
    targetUrl:  {
      type: String,
      required: [true, 'targetUrl is required'],
      trim: true,
      set: ensureHttp,
      validate: {
        validator: (v) => /^https?:\/\/[^\s]+$/i.test(v || ''),
        message: 'targetUrl must be a valid http(s) URL'
      }
    },

    sortIndex:  { type: Number, default: 0 },
    enabled:    { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('NewsHubEntry', NewsHubEntrySchema);
