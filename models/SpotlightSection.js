// models/SpotlightSection.js
const mongoose = require('mongoose');

const BgSchema = new mongoose.Schema(
  {
    mode: { type: String, enum: ['image', 'color', 'none'], default: 'image' },
    imageUrl: { type: String, default: '' },
    color: { type: String, default: '' },
    overlay: { type: Number, default: 0 }, // 0..100
  },
  { _id: false }
);

const SpotlightSectionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },

    // audience/scope targeting
    scopeType: {
      type: String,
      enum: ['global', 'category', 'state', 'city'],
      default: 'global',
      index: true,
    },
    scopeValue: { type: String, default: '', index: true },

    // placement logic
    placement: {
      type: String,
      enum: ['scroll', 'swipe', 'both'],
      default: 'both',
    },
    afterNth: { type: Number, default: 0 }, // inject after Nth article
    repeatEvery: { type: Number, default: 0 },
    repeatCount: { type: Number, default: 0 },

    enabled: { type: Boolean, default: true },

    background: { type: BgSchema, default: () => ({}) },
  },
  { timestamps: true }
);

SpotlightSectionSchema.index(
  { scopeType: 1, scopeValue: 1, enabled: 1, title: 1 },
  { name: 'spotlight_section_query' }
);

module.exports = mongoose.model('SpotlightSection', SpotlightSectionSchema);
