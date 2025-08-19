const LiveBanner = require('../models/liveBannerModel');

exports.createLiveBanner = async (req, res) => {
  try {
    const banner = await LiveBanner.create(req.body);
    res.status(201).json(banner);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getLiveBanners = async (req, res) => {
  try {
    const banners = await LiveBanner.find({ isActive: true }).sort({ position: 1 });
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
