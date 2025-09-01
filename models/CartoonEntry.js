// models/CartoonEntry.js
const mongoose = require('mongoose');

const VariantSchema = new mongoose.Schema({
  aspect:        { type: String, enum: ['16:9','9:16','4:16','1:1'], required: true },
  url:           { type: String, required: true },
  w:             { type: Number },
  h:             { type: Number },
  dominantColor: { type: String },
}, { _id: false });

const ScheduleSchema = new mongoose.Schema({
  daysOfWeek: { type: [Number], default: [] }, // 1=Mon..7=Sun, empty = all days
  startTime:  { type: String, default: '' },   // "HH:mm" local server time
  endTime:    { type: String, default: '' },   // "HH:mm"
}, { _id: false });

const CartoonEntrySchema = new mongoose.Schema({
  sectionId:   { type: mongoose.Schema.Types.ObjectId, ref: 'CartoonSection', required: true },
  title:       { type: String, required: true },
  caption:     { type: String, default: '' },
  credit:      { type: String, default: '' },
  tags:        { type: [String], default: [] },
  status:      { type: String, enum: ['draft','live'], default: 'live' },
  publishedAt: { type: Date },
  expiresAt:   { type: Date },
  variants:    { type: [VariantSchema], default: [] },
  schedule:    { type: ScheduleSchema, default: () => ({}) },
}, { timestamps: true });

CartoonEntrySchema.index({ sectionId: 1, status: 1 });
CartoonEntrySchema.index({ publishedAt: 1, expiresAt: 1 });

module.exports = mongoose.model('CartoonEntry', CartoonEntrySchema);
