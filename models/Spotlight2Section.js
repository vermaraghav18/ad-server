// models/Spotlight2Section.js
const mongoose = require('mongoose');

const Spotlight2SectionSchema = new mongoose.Schema(
  {
    // Admin-facing
    name: { type: String, required: true },                 // e.g. "Top Headlines"
    key:  { type: String, required: true, unique: true, lowercase: true, trim: true }, // "top-headlines"
    description: { type: String, default: '' },
    enabled: { type: Boolean, default: true },
    sortIndex: { type: Number, default: 0 },

    // Targeting (reuse pattern used elsewhere: global/category/state/city)
    targetType: {
      type: String,
      enum: ['global', 'category', 'state', 'city'],
      required: true,
      default: 'global',
    },
    targetValue: { type: String, default: '' }, // e.g. "politics", "Maharashtra", "Mumbai"

    // Modes (optional; if you don’t care, leave as both)
    modes: {
      type: [String],
      enum: ['scroll', 'swipe'],
      default: ['scroll', 'swipe'],
    },

    // Placement controls
    afterNth: { type: Number, default: 0 },       // inject after the Nth article (0 = before first)
    repeatEvery: { type: Number, default: 0 },    // 0 = no repeat; otherwise repeat every N items
    repeatCount: { type: Number, default: 1 },    // how many insertions to attempt
    placement: {
      type: String,
      enum: ['inline', 'rail', 'top', 'bottom'],
      default: 'inline',
    },
  },
  { timestamps: true }
);

Spotlight2SectionSchema.index({ enabled: 1, sortIndex: 1 });
Spotlight2SectionSchema.index({ key: 1 }, { unique: true });
Spotlight2SectionSchema.index({ targetType: 1, targetValue: 1, enabled: 1 });

module.exports = mongoose.model('Spotlight2Section', Spotlight2SectionSchema);
