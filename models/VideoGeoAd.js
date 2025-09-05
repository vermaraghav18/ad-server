// models/VideoGeoAd.js
const mongoose = require('mongoose');

const videoGeoAdSchema = new mongoose.Schema(
  {
    // Display
    title: { type: String, default: '' },
    description: { type: String, default: '' },

    // Clickthrough (CTA)
    link: { type: String, required: true },

    // Creative (video-first)
    videoUrl: { type: String, required: true }, // CDN URL (MP4 or HLS .m3u8)
    posterUrl: { type: String, default: '' },   // optional poster/thumbnail
    mime: { type: String, default: '' },        // e.g. "video/mp4" (optional)

    // Playback flags (client may override)
    autoplay: { type: Boolean, default: true },
    muted: { type: Boolean, default: true },
    loop: { type: Boolean, default: true },

    // Container style (kept to mirror existing ads)
    type: { type: String, enum: ['normal', 'fullpage'], default: 'normal' },

    // Targeting
    cities: { type: [String], default: [] },
    states: { type: [String], default: [] },

    // Placement (1-based)
    afterNth: { type: Number, default: 1 },
    repeatEvery: { type: Number, default: 0 },  // 0 = show once
    repeatCount: { type: Number, default: 0 },  // 0 = unlimited

    // Enable/disable
    enabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// normalize targeting entries to trimmed lower-case (optional but helpful)
videoGeoAdSchema.pre('save', function (next) {
  this.cities = (this.cities || []).map(s => String(s || '').trim());
  this.states = (this.states || []).map(s => String(s || '').trim());
  next();
});

module.exports = mongoose.model('VideoGeoAd', videoGeoAdSchema);
