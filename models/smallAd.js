// ad-server/models/smallAd.js
const mongoose = require('mongoose');

const smallAdSchema = new mongoose.Schema(
  {
    mediaUrl: { type: String, required: true },
    mediaType: { type: String, enum: ['image', 'video'], required: true },
    width: { type: Number },
    height: { type: Number },
    placementIndex: { type: Number, required: true, min: 1 }, // after Nth news card
    targetUrl: { type: String, default: '' },
    enabled: { type: Boolean, default: true },
    sortIndex: { type: Number, default: 0 },

    // 🔽 NEW
    repeatEvery: { type: Number, default: 0, min: 0 }, // 0 = no repeat
    repeatCount: { type: Number, default: 0, min: 0 }, // 0 = no repeat
  },
  { timestamps: true }
);

module.exports = mongoose.model('SmallAd', smallAdSchema);
