const mongoose = require('mongoose');

const ArticleSchema = new mongoose.Schema({
  imageUrl: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  source: { type: String, required: true },
});

const BannerWithArticleSchema = new mongoose.Schema({
  bannerUrl: { type: String, required: true },   // Banner image
  position: { type: Number, required: true },    // nth card placement
  article: { type: ArticleSchema, required: true },
}, { timestamps: true });

module.exports = mongoose.model('BannerWithArticle', BannerWithArticleSchema);
