// ad-server/models/newsHubEntry.js
const mongoose = require('mongoose');

const NewsHubEntrySchema = new mongoose.Schema(
  {
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'NewsHubSection',
      required: true,
      index: true,
    },
    imageUrl: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    targetUrl: { type: String, default: '', trim: true },
    sortIndex: { type: Number, default: 0 },
    enabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('NewsHubEntry', NewsHubEntrySchema);
