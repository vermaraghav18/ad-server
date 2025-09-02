// models/geoAdModel.js
const mongoose = require('mongoose');

const geoAdSchema = new mongoose.Schema(
  {
    title: String,
    link: { type: String, required: true },
    description: String,
    type: { type: String, enum: ['normal', 'fullpage'], default: 'normal' },
    enabled: { type: Boolean, default: true },
    imageUrl: { type: String, required: true },

    // Location targeting
    cities: [String],
    states: [String],

    // Scheduling
    afterNth: { type: Number, default: 0, min: 0 },
    repeatEvery: { type: Number, default: 0, min: 0 },
    repeatCount: { type: Number, default: 0, min: 0 },

    origin: { type: String, default: 'geo-ads', immutable: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('GeoAd', geoAdSchema);
