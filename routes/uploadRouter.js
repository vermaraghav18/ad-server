const express = require('express');
const multer  = require('multer');
const router  = express.Router();
const upload  = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// If you already have utils/cloudinary.js, use that:
const { v2: cloudinary } = require('../utils/cloudinary'); // <-- your existing config

router.post('/image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    const file64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    const result = await cloudinary.uploader.upload(file64, {
      folder: 'live-banners',
      resource_type: 'auto', // handles images & short videos
    });
    res.json({ url: result.secure_url, public_id: result.public_id, width: result.width, height: result.height });
  } catch (e) {
    console.error('Cloudinary upload failed:', e);
    res.status(500).json({ error: 'Upload failed' });
  }
});

module.exports = router;
