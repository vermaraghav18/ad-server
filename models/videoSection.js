// models/VideoSection.js
const mongoose = require('mongoose');

const InjectionSchema = new mongoose.Schema({
  afterNth:    { type: Number, default: 5, min: 1 },
  repeatEvery: { type: Number, default: 0, min: 0 }, // 0 = no repeat
  repeatCount: { type: Number, default: 0, min: 0 }, // 0 = no repeat
}, { _id: false });

const VideoSectionSchema = new mongoose.Schema({
  title:      { type: String, required: true },
  sectionKey: { type: String, default: '' }, // optional label for admin

  // Targeting scope (mirrors CartoonSection)
  scopeType:  { type: String, enum: ['global','category','state','city'], default: 'global' },
  scopeValue: { type: String, default: '' }, // used only when scopeType != global

  // Where this is allowed to render
  placement:  { type: String, enum: ['scroll','swipe','both'], default: 'both' },

  // Injection controls (after nth article + repeats)
  injection:  { type: InjectionSchema, default: () => ({}) },

  // Admin controls
  enabled:    { type: Boolean, default: true },
  sortIndex:  { type: Number, default: 0 },
}, { timestamps: true });

VideoSectionSchema.index({ scopeType: 1, scopeValue: 1, enabled: 1 });

module.exports = mongoose.model('VideoSection', VideoSectionSchema);
