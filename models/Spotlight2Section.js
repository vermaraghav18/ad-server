// models/Spotlight2Section.js
const mongoose = require('mongoose');

const Spotlight2SectionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },       // Admin-facing name, e.g., "Top Headlines"
    key: { type: String, required: true, unique: true, lowercase: true, trim: true }, // slug, e.g., "top-headlines"
    description: { type: String, default: '' },
    enabled: { type: Boolean, default: true },
    sortIndex: { type: Number, default: 0 },      // for ordering sections in admin or plan
  },
  { timestamps: true }
);

Spotlight2SectionSchema.index({ enabled: 1, sortIndex: 1 });
Spotlight2SectionSchema.index({ key: 1 }, { unique: true });

module.exports = mongoose.model('Spotlight2Section', Spotlight2SectionSchema);
