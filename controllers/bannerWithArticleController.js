const BannerWithArticle = require('../models/bannerWithArticle');
const cloudinary = require('../utils/cloudinary');

// Create new banner with article
exports.createBanner = async (req, res) => {
  try {
    // Upload banner image
    const bannerUpload = await cloudinary.uploader.upload(req.files.banner[0].path, {
      folder: 'banners'
    });

    // Upload article image
    const articleUpload = await cloudinary.uploader.upload(req.files.articleImage[0].path, {
      folder: 'articles'
    });

    const newBanner = new BannerWithArticle({
      bannerUrl: bannerUpload.secure_url,
      position: req.body.position,
      article: {
        imageUrl: articleUpload.secure_url,
        title: req.body.title,
        description: req.body.description,
        source: req.body.source,
      }
    });

    await newBanner.save();
    res.status(201).json(newBanner);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error creating banner with article' });
  }
};

// Get all banners
exports.getBanners = async (req, res) => {
  try {
    const banners = await BannerWithArticle.find().sort({ createdAt: -1 });
    res.json(banners);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching banners' });
  }
};

// Delete banner
exports.deleteBanner = async (req, res) => {
  try {
    const banner = await BannerWithArticle.findById(req.params.id);
    if (!banner) return res.status(404).json({ error: 'Banner not found' });

    await BannerWithArticle.findByIdAndDelete(req.params.id);
    res.json({ message: 'Banner deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Error deleting banner' });
  }
};
