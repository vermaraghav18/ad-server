// ad-server/controllers/moviePromoBannerController.js
const MoviePromoBanner = require('../models/moviePromoBanner');

const allowedCategories = ['Trending Now', 'Top Rated', 'Coming Soon'];

function normalizeVotes(v) {
  if (v == null) return '0';
  let s = String(v).trim();
  if (!s) return '0';
  const low = s.toLowerCase();
  // keep "12k" / "1.2m" as-is for display, or normalize numbers
  if (low.endsWith('k') || low.endsWith('m')) return s;
  const n = parseInt(s.replace(/[, ]/g, ''), 10);
  return Number.isNaN(n) ? '0' : String(n);
}

exports.getAll = async (req, res) => {
  try {
    const banners = await MoviePromoBanner.find({ enabled: true }).sort({ sortIndex: 1 });
    res.json(banners);
  } catch (err) {
    console.error("❌ Failed to fetch banners:", err);
    res.status(500).json({ message: 'Error fetching banners', error: String(err.message || err) });
  }
};

exports.create = async (req, res) => {
  try {
    console.log("📥 Received POST /api/movie-banners");

    if (!req.file) {
      return res.status(400).json({ message: "Poster image is required (field: 'poster')." });
    }

    const { rating, votes, enabled, sortIndex, category } = req.body;

    const validatedCategory = allowedCategories.includes(category)
      ? category
      : 'Trending Now';

    const ratingNum = Math.max(0, Math.min(10, parseFloat(rating)));
    const votesStr = normalizeVotes(votes);

    const newBanner = new MoviePromoBanner({
      posterUrl: `/uploads/movie-banners/${req.file.filename}`,
      rating: isFinite(ratingNum) ? ratingNum : 0,
      votes: votesStr, // store as string for display
      enabled: enabled === 'true' || enabled === true,
      sortIndex: Number.parseInt(sortIndex, 10) || 0,
      category: validatedCategory,
    });

    await newBanner.save();
    console.log("✅ Saved new banner:", newBanner);
    res.status(201).json(newBanner);
  } catch (err) {
    console.error("❌ Failed to create banner:", err);
    res.status(400).json({ message: 'Error creating banner', error: String(err.message || err) });
  }
};

exports.delete = async (req, res) => {
  try {
    await MoviePromoBanner.findByIdAndDelete(req.params.id);
    console.log(`🗑️ Deleted banner with ID: ${req.params.id}`);
    res.sendStatus(204);
  } catch (err) {
    console.error("❌ Failed to delete banner:", err);
    res.status(500).json({ message: 'Error deleting banner', error: String(err.message || err) });
  }
};
