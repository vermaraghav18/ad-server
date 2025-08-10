// backend/routes/movieRouter.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const {
  getTheatreMovies,
  getTrailerMovies,
  createMovie,
  updateMovie,
  deleteMovie,
} = require('../controllers/movieController');

const Movie = require('../models/movieModel');

// ---- Multer storage (absolute paths + ensure dirs exist) ----
const storage = multer.diskStorage({
  destination(req, file, cb) {
    // form sends `type` as 'theatre' or 'trailer' (default safely)
    const t = (req.body?.type || 'theatre').toString().toLowerCase();
    const isTrailer = t === 'trailer';

    const dir = path.join(
      __dirname,
      '..',
      'uploads',
      isTrailer ? 'trailer-movies' : 'theatre-movies'
    );

    try {
      fs.mkdirSync(dir, { recursive: true }); // ensure folder exists
      cb(null, dir);
    } catch (err) {
      cb(err);
    }
  },
  filename(req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });
// -------------------------------------------------------------

// Routes
router.get('/theatre-movies', getTheatreMovies);
router.get('/trailer-movies', getTrailerMovies);
router.post('/movies', upload.single('poster'), createMovie);
router.put('/movies/:id', updateMovie);
router.delete('/movies/:id', deleteMovie);

// Get distinct genres
router.get('/genres', async (req, res) => {
  try {
    const genres = await Movie.distinct('genres');
    res.json(genres);
  } catch (err) {
    console.error('❌ Failed to fetch genres:', err);
    res.status(500).json({ message: 'Failed to fetch genres' });
  }
});

module.exports = router;
