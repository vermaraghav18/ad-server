const LiveBanner = require('../models/liveBannerModel');
const { uploadPath } = require('../utils/cloudinary');

exports.createLiveBanner = async (req, res) => {
  try {
    const position = Number(req.body.position) || 1;

    // Accept either file upload or direct URL fallback
    let imageUrl = req.body.imageUrl || '';

    if (req.file) {
      const result = await uploadPath(req.file.path, 'knotshorts/live-banners');
      imageUrl = result.secure_url;
    }

    if (!imageUrl) {
      return res.status(400).json({ error: 'image (file) or imageUrl is required' });
    }

    const banner = await LiveBanner.create({ imageUrl, position, isActive: true });
    res.status(201).json(banner);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getLiveBanners = async (req, res) => {
  try {
    const banners = await LiveBanner.find().sort({ position: 1, createdAt: 1 });
    res.json(banners);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteLiveBanner = async (req, res) => {
  try {
    await LiveBanner.findByIdAndDelete(req.params.id);
    // (Optional) If you later store Cloudinary public_id, you can destroy it here.
    res.json({ message: 'Banner deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
