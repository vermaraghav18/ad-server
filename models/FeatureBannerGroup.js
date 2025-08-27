// models/FeatureBannerGroup.js
const mongoose = require('mongoose');

const FeatureItemSchema = new mongoose.Schema(
  {
    title: { type: String, default: '' },
    link: { type: String, default: '' },        // optional deep link / canonical URL
    imageUrl: { type: String, default: '' },    // Cloudinary/HTTPS URL
    description: { type: String, default: '' }, // ✅ NEW: description shown under title
    pubDate: { type: Date },                    // optional
  },
  { _id: false }
);

const FeatureBannerGroupSchema = new mongoose.Schema(
  {
    name:      { type: String, required: true },   // e.g. "sports"
    category:  { type: String, required: true },   // e.g. "Top News"
    nth:       { type: Number, default: 3 },       // inject after Nth article
    priority:  { type: Number, default: 0 },       // higher first
    enabled:   { type: Boolean, default: true },

    // ✅ NEW: target a specific article by key (from RSS-agg Article.id)
    articleKey: { type: String, default: '' },

    // Optional time window
    startsAt: { type: Date },
    endsAt:   { type: Date },

    // Items that will be shown in the feature banner (2–4 recommended)
    items: { type: [FeatureItemSchema], default: [] },
  },
  { timestamps: true }
);

// Make Flutter/React clients happier
FeatureBannerGroupSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (_doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    return ret;
  },
});

module.exports = mongoose.model('FeatureBannerGroup', FeatureBannerGroupSchema);
