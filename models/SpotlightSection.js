// ad-server/models/SpotlightSection.js
const mongoose = require('mongoose');

const SpotlightSectionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },

    // targeting / scope
    sectionType: {
      type: String,
      enum: ['category', 'state', 'city'],
      required: true,
    },
    sectionValue: { type: String, required: true }, // e.g., 'Top', 'Delhi', 'Jalandhar'

    // placement behavior
    placement: {
      type: String,
      enum: ['both', 'scroll', 'swipe'],
      default: 'both',
    },
    afterNth: { type: Number, default: 5 },     // show first after Nth article
    repeatEvery: { type: Number, default: 0 },  // 0 = show once
    repeatCount: { type: Number, default: 0 },  // 0 = unlimited

    // enable/disable
    enabled: { type: Boolean, default: true },

    // background config (image OR gradient)
    background: {
      kind: { type: String, enum: ['gradient', 'image'], default: 'gradient' },

      // if kind === 'image'
      imageUrl: { type: String, default: '' }, // Cloudinary URL

      // overlay for either mode (optional)
      overlayColor: { type: String, default: '#000000' },
      overlayOpacity: { type: Number, default: 0.0 }, // 0..1

      // if kind === 'gradient'
      gradient: {
        colors: { type: [String], default: ['#7A0000', '#E00000'] },
        orientation: {
          type: String,
          enum: ['vertical', 'horizontal'],
          default: 'vertical',
        },
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SpotlightSection', SpotlightSectionSchema);
