const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  getTheatreMovies,
  getTrailerMovies,
  createMovie,
  updateMovie,
  deleteMovie
} = require('../controllers/movieController');

const Movie = require('../models/movieModel'); // ✅ NEW

// Multer setup
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const folder = req.body.type === 'theatre' ? 'uploads/theatre-movies' : 'uploads/trailer-movies';
    cb(null, folder);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

// Routes
router.get('/theatre-movies', getTheatreMovies);
router.get('/trailer-movies', getTrailerMovies);
router.post('/movies', upload.single('poster'), createMovie);
router.put('/movies/:id', updateMovie);
router.delete('/movies/:id', deleteMovie);

// ✅ NEW: Get distinct genres
router.get('/genres', async (req, res) => {
  try {
    const genres = await Movie.distinct('genres');
    res.json(genres);
  } catch (err) {
    console.error("❌ Failed to fetch genres:", err);
    res.status(500).json({ message: 'Failed to fetch genres' });
  }
});

module.exports = router;
