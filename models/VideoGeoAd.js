// models/VideoGeoAd.js
const mongoose = require('mongoose');

function norm(v) {
  return String(v || '').trim();
}
function normLower(v) {
  return String(v || '').trim().toLowerCase();
}

const videoGeoAdSchema = new mongoose.Schema(
  {
    title: { type: String, default: '' },
    description: { type: String, default: '' },

    // Destination when user taps the ad
    link: { type: String, required: true },

    // Video (HLS mp4/m3u8 etc.)
    videoUrl: { type: String, required: true },
    posterUrl: { type: String, default: '' },
    mime: { type: String, default: '' },

    // Targeting (existing)
    cities: { type: [String], default: [] },   // e.g. ["Mumbai"]
    states: { type: [String], default: [] },   // e.g. ["Maharashtra"]

    // ✅ NEW: category targeting for tabs like Top News, Finance
    // store lowercased keywords like ["top", "finance", "sports"]
    categories: { type: [String], default: [] },

    // Placement controls
    afterNth: { type: Number, default: 1 },
    repeatEvery: { type: Number, default: 0 },
    repeatCount: { type: Number, default: 0 },

    enabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Normalize arrays on save/update
videoGeoAdSchema.pre('save', function (next) {
  this.cities = (this.cities || []).map(norm);
  this.states = (this.states || []).map(norm);
  this.categories = (this.categories || []).map(normLower);
  next();
});

module.exports = mongoose.model('VideoGeoAd', videoGeoAdSchema);
