// models/CartoonSection.js
const mongoose = require('mongoose');

const PlacementRuleSchema = new mongoose.Schema({
  target: {
    type: String,
    enum: ['home', 'news_hub', 'custom_news', 'any'],
    required: true,
    default: 'home'
  },
  afterNth: { type: Number, required: true },   // e.g., 5 = show after 5th card
  repeatEvery: { type: Number, default: 0 },     // 0 = only once; 7 = repeat every 7 items
  enabled: { type: Boolean, default: true },
});

const CartoonItemSchema = new mongoose.Schema({
  imageUrl: { type: String, required: true },     // your CDN/Cloudinary URL
  caption: { type: String },
  credit:  { type: String },
  order:   { type: Number, default: 0 },          // for manual reordering in a section
  isActive:{ type: Boolean, default: true },
  publishedAt: { type: Date, default: Date.now }
}, { _id: true, timestamps: true });

const CartoonSectionSchema = new mongoose.Schema({
  title:      { type: String, required: true },   // "Satire Set 1"
  slug:       { type: String, required: true, unique: true }, // "satire-set-1"
  description:{ type: String },
  bannerImageUrl: { type: String },               // 4:16 banner preview for the scroll feed
  isActive:   { type: Boolean, default: true },
  placements: { type: [PlacementRuleSchema], default: [] },
  items:      { type: [CartoonItemSchema], default: [] },
}, { timestamps: true });

module.exports = mongoose.model('CartoonSection', CartoonSectionSchema);
