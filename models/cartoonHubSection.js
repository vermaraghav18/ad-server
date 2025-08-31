// ad-server/models/cartoonHubSection.js
const mongoose = require('mongoose');

const CartoonHubSectionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },        // short key/slug
    heading: { type: String, required: true, trim: true },     // display title
    placementIndex: { type: Number, required: true, min: 1 },  // insert after Nth news card
    repeatEvery: { type: Number, default: 0, min: 0 },         // 0 = no repeat; K = repeat every K cards
    sortIndex: { type: Number, default: 0 },                   // order within same placement
    enabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CartoonHubSection', CartoonHubSectionSchema);
