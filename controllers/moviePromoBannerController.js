// ad-server/controllers/moviePromoBannerController.js
const MoviePromoBanner = require('../models/moviePromoBanner');
const cloudinary = require('../utils/cloudinary');
const fs = require('fs');

const allowedCategories = ['Trending Now', 'Top Rated', 'Coming Soon'];

function normalizeVotes(v) {
  if (v == null) return '0';
  let s = String(v).trim();
  if (!s) return '0';
  const low = s.toLowerCase();
  if (low.endsWith('k') || low.endsWith('m')) return s; // keep display strings
  const n = parseInt(s.replace(/[, ]/g, ''), 10);
  return Number.isNaN(n) ? '0' : String(n);
}

function sanitizeUrl(u) {
  if (!u || typeof u !== 'string') return '';
  const s = u.trim();
  try {
    // Add https:// if user pasted without scheme
    const withScheme = /^https?:\/\//i.test(s) ? s : `https://${s}`;
    const url = new URL(withScheme);
    return url.toString();
  } catch {
    return '';
  }
}

exports.getAll = async (_req, res) => {
  try {
    const banners = await MoviePromoBanner.find({ enabled: true }).sort({ sortIndex: 1 });
    res.json(banners);
  } catch (err) {
    console.error('❌ Failed to fetch banners:', err);
    res.status(500).json({ message: 'Error fetching banners', error: String(err.message || err) });
  }
};

exports.create = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Poster image is required (field: 'poster')." });
    }

    const {
      rating,
      votes,
      enabled,
      sortIndex,
      category,
      placementIndex, // free-form
      heading,        // optional heading
      targetUrl,      // NEW: click-through link
    } = req.body;

    const validatedCategory =
      allowedCategories.includes(category) ? category : 'Trending Now';

    const ratingNum = Math.max(0, Math.min(10, parseFloat(rating)));
    const votesStr  = normalizeVotes(votes);

    // sanitize placementIndex: integer >= 1
    let placement = parseInt(String(placementIndex ?? '').trim(), 10);
    if (!Number.isFinite(placement) || placement < 1) placement = 5;

    // sanitize heading and url
    const headingText = typeof heading === 'string' ? heading.trim().slice(0, 120) : '';
    const cleanTargetUrl = sanitizeUrl(targetUrl);

    // Upload temp file to Cloudinary
    const upload = await cloudinary.uploader.upload(req.file.path, {
      folder: 'knotshorts/movie-banners',
      resource_type: 'image',
    });

    // Best-effort cleanup
    try { fs.unlinkSync(req.file.path); } catch {}

    const newBanner = await MoviePromoBanner.create({
      posterUrl: upload.secure_url,
      rating: Number.isFinite(ratingNum) ? ratingNum : 0,
      votes: votesStr,
      enabled: enabled === 'true' || enabled === true,
      sortIndex: Number.parseInt(sortIndex, 10) || 0,
      category: validatedCategory,
      placementIndex: placement,
      heading: headingText,
      targetUrl: cleanTargetUrl, // ✅ NEW
    });

    res.status(201).json(newBanner);
  } catch (err) {
    console.error('❌ Failed to create banner:', err);
    res.status(400).json({ message: 'Error creating banner', error: String(err.message || err) });
  }
};

exports.delete = async (req, res) => {
  try {
    await MoviePromoBanner.findByIdAndDelete(req.params.id);
    res.sendStatus(204);
  } catch (err) {
    console.error('❌ Failed to delete banner:', err);
    res.status(500).json({ message: 'Error deleting banner', error: String(err.message || err) });
  }
};
