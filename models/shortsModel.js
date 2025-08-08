// ad-server/models/shortsModel.js
const mongoose = require('mongoose');

const ShortsSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true },
    platform: {
      type: String,
      enum: ['youtube', 'instagram', 'x', 'other'],
      default: 'other',
    },
    sourceName: { type: String, required: true, trim: true }, // e.g., "YouTube"
    thumbnailUrl: { type: String, default: '' },

    // Which sections/tabs this short should appear in
    sections: { type: [String], default: [] }, // e.g., ["Top News","India","Movies"]

    // Visibility & ordering
    enabled: { type: Boolean, default: true },
    sortIndex: { type: Number, default: 0 },

    // Quick placement flags
    showInNews: { type: Boolean, default: false },
    showInMovies: { type: Boolean, default: false },

    // For injecting into news feed after N cards (default 5)
    injectEveryNCards: { type: Number, default: 5 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ShortItem', ShortsSchema);
