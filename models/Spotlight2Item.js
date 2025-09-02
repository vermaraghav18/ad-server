// models/Spotlight2Item.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const Spotlight2ItemSchema = new Schema(
  {
    sectionId: { type: Schema.Types.ObjectId, ref: 'Spotlight2Section', required: true },

    // Core fields
    imageUrl: { type: String, default: '' },      // Cloudinary or uploaded image URL
    sourceName: { type: String, default: '' },    // e.g., "The Hindu"
    title: { type: String, required: true },
    description: { type: String, default: '' },
    linkUrl: { type: String, default: '' },       // optional: final article link
    publishedAt: { type: Date },                  // "time" field from your spec

    // Admin control
    enabled: { type: Boolean, default: true },
    sortIndex: { type: Number, default: 0 },      // ordering within a section

    // Raw/derived metadata from auto-fetch (for reference)
    meta: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

Spotlight2ItemSchema.index({ sectionId: 1, enabled: 1, sortIndex: 1, createdAt: -1 });
Spotlight2ItemSchema.index({ title: 'text', description: 'text', sourceName: 'text' });

module.exports = mongoose.model('Spotlight2Item', Spotlight2ItemSchema);
