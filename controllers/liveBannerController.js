const LiveBanner = require('../models/liveBannerModel');
const { uploadPath } = require('../utils/cloudinary');

exports.createLiveBanner = async (req, res) => {
  try {
    const { headline, articles } = req.body;

    // ✅ Articles ko parse karo
    let parsedArticles = [];
    if (articles) {
      try {
        parsedArticles = JSON.parse(articles);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid articles format' });
      }
    }

    // ✅ Image upload compulsory
    let mediaUrl = '';
    if (req.file) {
      const result = await uploadPath(req.file.path, 'knotshorts/live-banners');
      mediaUrl = result.secure_url;
    } else {
      return res.status(400).json({ error: 'Image file is required' });
    }

    const banner = await LiveBanner.create({
      headline,
      mediaUrl,
      articles: parsedArticles
    });

    res.status(201).json(banner);
  } catch (err) {
    console.error("Create banner error:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.getLiveBanners = async (req, res) => {
  try {
    const banners = await LiveBanner.find().sort({ createdAt: -1 });
    res.json(banners);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteLiveBanner = async (req, res) => {
  try {
    await LiveBanner.findByIdAndDelete(req.params.id);
    res.json({ message: 'Banner deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
