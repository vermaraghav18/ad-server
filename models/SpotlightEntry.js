// ad-server/models/SpotlightEntry.js
const mongoose = require('mongoose');

const VariantSchema = new mongoose.Schema(
  {
    aspect: { type: String, default: '16:9' }, // '16:9' | '9:16' | '1:1'
    url: { type: String, required: true },     // Cloudinary image URL
  },
  { _id: false }
);

const SpotlightEntrySchema = new mongoose.Schema(
  {
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SpotlightSection',
      required: true,
    },

    status: { type: String, enum: ['live', 'draft', 'dead'], default: 'live' },
    enabled: { type: Boolean, default: true },
    order: { type: Number, default: 0 },

    source: { type: String, default: '' },      // small label
    title: { type: String, required: true },    // bold heading
    description: { type: String, default: '' }, // 1–3 lines
    link: { type: String, default: '' },        // optional deeplink/click-thru

    variants: { type: [VariantSchema], default: [] }, // images per aspect

    publishedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SpotlightEntry', SpotlightEntrySchema);
