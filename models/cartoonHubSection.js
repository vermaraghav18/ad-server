// models/cartoonHubSection.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const CartoonHubSectionSchema = new Schema(
  {
    // Basic
    name: { type: String, required: true, trim: true },     // slug/key (e.g., "memes_finance_morning")
    heading: { type: String, required: true, trim: true },  // display title

    // Scheduling / placement
    placementIndex: { type: Number, required: true, min: 1 },   // after Nth article (1-based)
    repeatEvery: { type: Number, default: 0, min: 0 },          // 0 = no repeat
    repeatCount: { type: Number, default: 0, min: 0 },          // 0 = unlimited
    sortIndex: { type: Number, default: 0 },

    // Visibility
    enabled: { type: Boolean, default: true },
    placement: {
      type: String,
      enum: ['swipe', 'scroll', 'both'],
      default: 'both',
    },

    // Targeting (city/state/category/global)
    scopeType: {
      type: String,
      enum: ['global', 'category', 'state', 'city'],
      default: 'global',
    },
    scopeValue: { type: String, default: '' }, // e.g., "top news", "punjab", "mumbai"
  },
  { timestamps: true }
);

// Normalize scopeValue (store as trimmed string)
CartoonHubSectionSchema.pre('save', function (next) {
  if (typeof this.scopeValue === 'string') {
    this.scopeValue = this.scopeValue.trim();
  }
  next();
});

CartoonHubSectionSchema.index({ enabled: 1, placementIndex: 1 });
CartoonHubSectionSchema.index({ scopeType: 1, scopeValue: 1 });

module.exports = mongoose.model('CartoonHubSection', CartoonHubSectionSchema);
