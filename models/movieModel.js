// ad-server/models/movieModel.js
const mongoose = require('mongoose');

const castSchema = new mongoose.Schema({
  name: String,
  role: String,
  avatar: String
}, { _id: false });

const songSchema = new mongoose.Schema({
  title: String,
  artist: String
}, { _id: false });

const movieSchema = new mongoose.Schema({
  title: { type: String, required: true },
  releaseDate: { type: String, required: true },
  genres: [{ type: String }],
  posterUrl: { type: String, required: true },
  trailerUrl: { type: String }, // Optional
  type: { type: String, enum: ['theatre', 'trailer'], required: true },
  enabled: { type: Boolean, default: true },
  sortIndex: { type: Number, default: 0 },

  // 🔽 New fields for your UI
  month: { type: String },
  language: { type: String },
  platform: { type: String },
  summary: { type: String },
  cast: [castSchema],
  songs: [songSchema],
  rating: { type: Number, min: 0, max: 10, default: 0 } // ✅ Rating field
}, { timestamps: true });

module.exports = mongoose.model('Movie', movieSchema);
