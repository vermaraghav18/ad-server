// ad-server/models/newsHubSection.js
const mongoose = require('mongoose');

const NewsHubSectionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    heading: { type: String, required: true, trim: true },
    placementIndex: { type: Number, required: true, min: 1 },
    sortIndex: { type: Number, default: 0 },
    enabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('NewsHubSection', NewsHubSectionSchema);
