const LiveBanner = require('../models/liveBannerModel');
const { uploadPath } = require('../utils/cloudinary');

exports.createLiveBanner = async (req, res) => {
  try {
    const { headline } = req.body;

    if (!headline) {
      return res.status(400).json({ error: 'Headline is required' });
    }

    // Parse articles JSON
    let articles = [];
    if (req.body.articles) {
      try {
        articles = JSON.parse(req.body.articles);
        if (!Array.isArray(articles)) {
          return res.status(400).json({ error: 'Articles must be an array' });
        }
      } catch (err) {
        return res.status(400).json({ error: 'Invalid articles JSON' });
      }
    }

    // Upload banner image
    let mediaUrl = req.body.mediaUrl || '';
    if (req.file) {
      const result = await uploadPath(req.file.path, 'knotshorts/live-banners');
      mediaUrl = result.secure_url;
    }

    if (!mediaUrl) {
      return res.status(400).json({ error: 'Image is required' });
    }

    const banner = await LiveBanner.create({
      headline,
      mediaUrl,
      articles,
    });

    res.status(201).json(banner);
  } catch (err) {
    console.error('Error creating live banner:', err);
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
