// models/CartoonSection.js
const mongoose = require('mongoose');

const InjectionSchema = new mongoose.Schema({
  afterNth:    { type: Number, default: 5, min: 1 },
  repeatEvery: { type: Number, default: 0, min: 0 }, // 0 = no repeat
  repeatCount: { type: Number, default: 0, min: 0 }, // 0 = unlimited
}, { _id: false });

const CartoonSectionSchema = new mongoose.Schema({
  title:      { type: String, required: true },
  sectionKey: { type: String, default: '' }, // optional label for admin
  scopeType:  { type: String, enum: ['global','category','state','city'], default: 'global' },
  scopeValue: { type: String, default: '' }, // used only when scopeType != global
  placement:  { type: String, enum: ['scroll','swipe','both'], default: 'both' },
  injection:  { type: InjectionSchema, default: () => ({}) },
  enabled:    { type: Boolean, default: true },
  sortIndex:  { type: Number, default: 0 },
}, { timestamps: true });

CartoonSectionSchema.index({ scopeType: 1, scopeValue: 1, enabled: 1 });

module.exports = mongoose.model('CartoonSection', CartoonSectionSchema);
