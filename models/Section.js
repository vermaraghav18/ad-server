// models/Section.js
const mongoose = require('mongoose');

function slugify(str) {
  return String(str || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

const SectionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      set: (v) => slugify(v),
    },
    order: { type: Number, default: 999 },
    enabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// keep slug in sync if name changes and slug not explicitly set
SectionSchema.pre('validate', function (next) {
  if (!this.slug && this.name) this.slug = this.name;
  next();
});

module.exports = mongoose.model('Section', SectionSchema);
