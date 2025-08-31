// ad-server/models/adModel.js
const mongoose = require('mongoose');

const adSchema = new mongoose.Schema(
  {
    title: String,
    link: { type: String, required: true },
    target: { type: String, default: 'All' },
    description: String,

    // "normal" or "fullpage"
    type: { type: String, enum: ['normal', 'fullpage'], default: 'normal' },

    enabled: { type: Boolean, default: true },

    imageUrl: { type: String, required: true }, // Cloudinary URL

    /**
     * NEW: placement — controls where Ads from this feature can appear.
     * - "swipeOnly" (default): app API will expose only to Swipe mode
     * - "both": (kept for possible future use)
     */
    placement: { type: String, enum: ['swipeOnly', 'both'], default: 'swipeOnly' },

    /**
     * NEW: origin — marks payloads created by this feature for downstream safety checks.
     * This is useful on the app side to skip Ads in Scroll even if they slip through.
     */
    origin: { type: String, default: 'ads', immutable: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Ad', adSchema);
