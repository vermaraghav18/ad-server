// models/VideoEntry.js
const mongoose = require('mongoose');

const ScheduleSchema = new mongoose.Schema({
  daysOfWeek: { type: [Number], default: [] }, // 1=Mon..7=Sun, empty = all days
  startTime:  { type: String, default: '' },   // "HH:mm" local server time
  endTime:    { type: String, default: '' },   // "HH:mm"
}, { _id: false });

const VideoEntrySchema = new mongoose.Schema({
  sectionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VideoSection',
    required: true,
    index: true,
  },

  // Sources
  hlsUrl:   { type: String, required: true, trim: true }, // Cloudinary m3u8 preferred
  mp4Url:   { type: String, default: '', trim: true },    // fallback (optional)
  posterUrl:{ type: String, required: true, trim: true }, // poster/thumbnail

  // Playback
  autoplay:    { type: Boolean, default: true },
  startMuted:  { type: Boolean, default: true },
  loop:        { type: Boolean, default: false },
  pipAllowed:  { type: Boolean, default: true },

  // Meta
  durationSec: { type: Number, default: 0, min: 0 },
  aspect:      { type: String, enum: ['16:9','9:16','1:1'], default: '16:9' },
  caption:     { type: String, default: '' },
  credit:      { type: String, default: '' },
  tags:        { type: [String], default: [] },

  // Subtitles
  subtitleUrl: { type: String, default: '' },
  subtitleLang:{ type: String, default: '' },

  // Availability
  status:      { type: String, enum: ['draft','live'], default: 'live' },
  publishedAt: { type: Date },
  expiresAt:   { type: Date },
  schedule:    { type: ScheduleSchema, default: () => ({}) },
}, { timestamps: true });

VideoEntrySchema.index({ sectionId: 1, status: 1 });
VideoEntrySchema.index({ publishedAt: 1, expiresAt: 1 });

module.exports = mongoose.model('VideoEntry', VideoEntrySchema);
