const mongoose = require('mongoose');

const moviePromoBannerSchema = new mongoose.Schema({
  posterUrl: { type: String, required: true },
  rating:   { type: Number, required: true },
  votes:    { type: String, required: true },

  enabled:   { type: Boolean, default: true },
  sortIndex: { type: Number, default: 0 },

  // Category (unchanged)
  category: {
    type: String,
    enum: ['Trending Now', 'Top Rated', 'Coming Soon'],
    default: 'Trending Now',
    required: true,
  },

  // NEW: free-form placement index (insert after Nth news card)
  placementIndex: { type: Number, min: 1, default: 5, required: true },

  // NEW: optional heading shown above the horizontal promo list
  heading: { type: String, default: '' },

  // NEW: optional click-through link
  targetUrl: { type: String, default: '' },
});

module.exports = mongoose.model('MoviePromoBanner', moviePromoBannerSchema);
