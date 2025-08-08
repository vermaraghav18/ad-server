const mongoose = require('mongoose');

const moviePromoBannerSchema = new mongoose.Schema({
  posterUrl: { type: String, required: true },
  rating: { type: Number, required: true },
  votes: { type: String, required: true },
  enabled: { type: Boolean, default: true },
  sortIndex: { type: Number, default: 0 },

  // ✅ NEW FIELD: Category
  category: {
    type: String,
    enum: ['Trending Now', 'Top Rated', 'Coming Soon'],
    default: 'Trending Now',
    required: true,
  },
});

module.exports = mongoose.model('MoviePromoBanner', moviePromoBannerSchema);
