// ad-server/controllers/moviePromoBannerController.js
const MoviePromoBanner = require('../models/moviePromoBanner');

const allowedCategories = ['Trending Now', 'Top Rated', 'Coming Soon'];

exports.getAll = async (req, res) => {
  try {
    const banners = await MoviePromoBanner.find({ enabled: true }).sort({ sortIndex: 1 });
    res.json(banners);
  } catch (err) {
    console.error("❌ Failed to fetch banners:", err);
    res.status(500).json({ message: 'Error fetching banners' });
  }
};

exports.create = async (req, res) => {
  try {
    console.log("📥 Received POST /api/movie-banners");

    const file = req.file;
    const { rating, votes, enabled, sortIndex, category } = req.body;

    if (!file) {
      return res.status(400).json({ message: "Poster image is required." });
    }

    // ✅ Validate category or fallback
    const validatedCategory = allowedCategories.includes(category)
      ? category
      : 'Trending Now';

    const newBanner = new MoviePromoBanner({
      posterUrl: `/uploads/movie-banners/${file.filename}`,
      rating: parseFloat(rating),
      votes: votes.trim(),
      enabled: enabled === 'true',
      sortIndex: parseInt(sortIndex),
      category: validatedCategory, // ✅ Include category
    });

    await newBanner.save();
    console.log("✅ Saved new banner:", newBanner);
    res.status(201).json(newBanner);
  } catch (err) {
    console.error("❌ Failed to create banner:", err);
    res.status(400).json({ message: 'Error creating banner' });
  }
};

exports.delete = async (req, res) => {
  try {
    await MoviePromoBanner.findByIdAndDelete(req.params.id);
    console.log(`🗑️ Deleted banner with ID: ${req.params.id}`);
    res.sendStatus(204);
  } catch (err) {
    console.error("❌ Failed to delete banner:", err);
    res.status(500).json({ message: 'Error deleting banner' });
  }
};
