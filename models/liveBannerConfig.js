// ad-server/models/liveBannerConfig.js
const mongoose = require('mongoose');

const LiveBannerConfigSchema = new mongoose.Schema(
  {
    headline: { type: String, default: 'Live Updates', trim: true, maxlength: 120 },
    mediaType: { type: String, enum: ['image', 'video'], default: 'image' },
    mediaUrl: { type: String, default: '' },
    insertAfterNthCard: { type: Number, default: 5, min: 0 },
    isEnabled: { type: Boolean, default: false },
    targetTopicId: { type: mongoose.Schema.Types.ObjectId, ref: 'LiveTopic', default: null },
  },
  { timestamps: true }
);

// We will keep a single document; upsert on update.
module.exports = mongoose.model('LiveBannerConfig', LiveBannerConfigSchema);
