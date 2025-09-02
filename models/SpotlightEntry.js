// models/SpotlightEntry.js
const mongoose = require('mongoose');

const SpotlightEntrySchema = new mongoose.Schema(
  {
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SpotlightSection',
      required: true,
      index: true,
    },

    title: { type: String, required: true, trim: true },
    subtitle: { type: String, default: '' },

    imageUrl: { type: String, default: '' },
    linkUrl: { type: String, default: '' },

    startAt: { type: Date },
    endAt: { type: Date },

    enabled: { type: Boolean, default: true },
    sortIndex: { type: Number, default: 0 },
  },
  { timestamps: true }
);

SpotlightEntrySchema.index({ sectionId: 1, enabled: 1, sortIndex: 1 });

module.exports = mongoose.model('SpotlightEntry', SpotlightEntrySchema);
