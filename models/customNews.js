const mongoose = require('mongoose');

const CustomNewsSchema = new mongoose.Schema(
  {
    imageUrl: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    source: { type: String, required: true },

    // ✅ NEW
    topic: { type: String, trim: true, default: '' },

    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

// helpful index (optional)
CustomNewsSchema.index({ isActive: 1, topic: 1, createdAt: -1 });

module.exports = mongoose.model('CustomNews', CustomNewsSchema);
