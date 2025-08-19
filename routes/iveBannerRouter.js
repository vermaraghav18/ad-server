// routes/liveBannerRoutes.js
const express = require('express');
const router = express.Router();
const LiveBanner = require('../models/liveBannerModel');

// 📌 Create new live banner
router.post('/', async (req, res) => {
  try {
    const banner = new LiveBanner(req.body);
    await banner.save();
    res.status(201).json(banner);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: 'Failed to create live banner' });
  }
});

// 📌 Get all banners
router.get('/', async (req, res) => {
  try {
    const banners = await LiveBanner.find();
    res.json(banners);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch banners' });
  }
});

// 📌 Update a banner
router.put('/:id', async (req, res) => {
  try {
    const banner = await LiveBanner.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(banner);
  } catch (error) {
    res.status(400).json({ error: 'Failed to update banner' });
  }
});

// 📌 Delete a banner
router.delete('/:id', async (req, res) => {
  try {
    await LiveBanner.findByIdAndDelete(req.params.id);
    res.json({ message: 'Banner deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete banner' });
  }
});

module.exports = router;
