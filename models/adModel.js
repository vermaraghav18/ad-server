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

    // Cloudinary URL
    imageUrl: { type: String, required: true },

    /**
     * placement — controls where Ads from this feature can appear.
     * - "swipeOnly" (default): app API will expose only to Swipe mode
     * - "both": (kept for possible future use)
     */
    placement: { type: String, enum: ['swipeOnly', 'both'], default: 'swipeOnly' },

    /**
     * origin — marks payloads created by this feature for downstream safety checks.
     * Useful on the app side to skip Ads in Scroll even if they slip through.
     */
    origin: { type: String, default: 'ads', immutable: true },

    /**
     * Scheduling (primarily for fullpage ads in Swipe mode)
     * - afterNth: insert after the Nth article card (1-based). 0 = disabled.
     * - repeatEvery: repeat every M article cards after the first. 0 = no repeat.
     * - repeatCount: maximum number of repeats after the first. 0 = unlimited (until feed end).
     */
    afterNth: { type: Number, default: 0, min: 0 },
    repeatEvery: { type: Number, default: 0, min: 0 },
    repeatCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Ad', adSchema);
