const mongoose = require('mongoose');

const LiveUpdateHubSectionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },        // short key/slug
    heading: { type: String, required: true, trim: true },     // display title
    placementIndex: { type: Number, required: true, min: 1 },  // where to inject in feed
    sortIndex: { type: Number, default: 0 },                   // order within same placement
    enabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('LiveUpdateHubSection', LiveUpdateHubSectionSchema);
