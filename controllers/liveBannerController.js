const LiveBanner = require("../models/liveBannerModel");
const { uploadPath } = require("../utils/cloudinary");

exports.createLiveBanner = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Banner image is required" });
    }

    // Upload banner image to Cloudinary
    const result = await uploadPath(req.file.path, "knotshorts/live-banners");
    const mediaUrl = result.secure_url;

    const headline = req.body.headline || "";

    // Parse articles (JSON string from frontend)
    let articles = [];
    if (req.body.articles) {
      try {
        articles = JSON.parse(req.body.articles);
      } catch (err) {
        return res.status(400).json({ error: "Invalid articles JSON" });
      }
    }

    const banner = await LiveBanner.create({
      headline,
      mediaUrl,
      articles,
    });

    res.status(201).json(banner);
  } catch (err) {
    console.error("Error creating live banner:", err);
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
    res.json({ message: "Banner deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
