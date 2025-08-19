// ad-server/models/liveEntry.js
const mongoose = require('mongoose');

const LiveEntrySchema = new mongoose.Schema(
  {
    topicId: { type: mongoose.Schema.Types.ObjectId, ref: 'LiveTopic', required: true, index: true },
    summary: { type: String, required: true, trim: true, maxlength: 280 },
    linkUrl: {
      type: String,
      required: true,
      validate: {
        validator: v => /^https?:\/\//i.test(v),
        message: 'linkUrl must start with http:// or https://',
      },
    },
    sourceName: { type: String, trim: true, maxlength: 80 },
    imageUrl: { type: String, trim: true },
    ordinal: { type: Number, default: 0, min: 0, index: true },
  },
  { timestamps: true }
);

LiveEntrySchema.index({ topicId: 1, ordinal: 1, createdAt: -1 });

module.exports = mongoose.model('LiveEntry', LiveEntrySchema);
