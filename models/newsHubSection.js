const mongoose = require('mongoose');

const NewsHubSectionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },        // slug
    heading: { type: String, required: true, trim: true },     // display title
    placementIndex: { type: Number, required: true, min: 1 },  // lane/row
    backgroundImageUrl: { type: String, default: "" },         // <-- NEW (swipe BG)
    sortIndex: { type: Number, default: 0 },                   // order in placement
    enabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('NewsHubSection', NewsHubSectionSchema);
