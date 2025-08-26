// models/CustomNews.js
const mongoose = require('mongoose');

const CustomNewsSchema = new mongoose.Schema(
  {
    imageUrl:   { type: String, required: true },
    title:      { type: String, required: true },
    description:{ type: String, required: true },
    source:     { type: String, required: true },
    isActive:   { type: Boolean, default: true },

    // optional extras used by banners (all optional)
    headline:   { type: String },
    url:        { type: String },  // web target
    link:       { type: String },  // alias (rssAgg uses url || link)
    deeplink:   { type: String },  // app target
    thumbUrl:   { type: String },  // small image override
    slug:       { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CustomNews', CustomNewsSchema);
