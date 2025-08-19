// ad-server/models/liveTopic.js
const mongoose = require('mongoose');

const LiveTopicSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, unique: true, lowercase: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

function slugify(s) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

LiveTopicSchema.pre('validate', function (next) {
  if (!this.slug && this.title) this.slug = slugify(this.title);
  next();
});

module.exports = mongoose.model('LiveTopic', LiveTopicSchema);
