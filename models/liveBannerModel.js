const mongoose = require("mongoose");

const articleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  sourceName: { type: String },
  sourceLink: { type: String }
});

const liveBannerSchema = new mongoose.Schema(
  {
    headline: { type: String, required: true },
    mediaUrl: { type: String, required: true }, // Cloudinary image
    articles: [articleSchema]
  },
  { timestamps: true }
);

module.exports = mongoose.model("LiveBanner", liveBannerSchema);
