const mongoose = require('mongoose');

const FeatureBannerItemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    imageUrl: { type: String, default: '' },
    link: { type: String, default: '' },
    pubDate: { type: Date },
    // NEW: description shown below title in the card
    description: { type: String, default: '' },
  },
  { _id: false }
);

const FeatureBannerGroupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    category: { type: String, required: true },        // e.g. "Sports", "Top News"
    nth: { type: Number, default: 0 },                 // place after Nth article
    priority: { type: Number, default: 0 },
    enabled: { type: Boolean, default: true },
    startAt: { type: Date },
    endAt: { type: Date },

    // NEW: inject below a specific article when provided (wins over nth)
    // This should match the "id" field from /api/rss-agg items.
    articleKey: { type: String, default: '' },

    items: { type: [FeatureBannerItemSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('FeatureBannerGroup', FeatureBannerGroupSchema);
