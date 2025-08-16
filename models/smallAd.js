// ad-server/models/smallAd.js
const mongoose = require('mongoose');

const smallAdSchema = new mongoose.Schema(
  {
    mediaUrl: { type: String, required: true },
    mediaType: { type: String, enum: ['image', 'video'], required: true },
    width: { type: Number },   // intrinsic width from Cloudinary
    height: { type: Number },  // intrinsic height from Cloudinary
    placementIndex: { type: Number, required: true, min: 1 }, // after Nth news card
    targetUrl: { type: String, default: '' },
    enabled: { type: Boolean, default: true },
    sortIndex: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SmallAd', smallAdSchema);
