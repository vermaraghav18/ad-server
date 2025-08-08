// ad-server/controllers/movieController.js
const Movie = require('../models/movieModel');

// GET: Theatre movies
exports.getTheatreMovies = async (req, res) => {
  try {
    const movies = await Movie.find({ type: 'theatre', enabled: true }).sort({ sortIndex: 1 });
    res.json(movies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET: Trailer movies
exports.getTrailerMovies = async (req, res) => {
  try {
    const movies = await Movie.find({ type: 'trailer', enabled: true }).sort({ sortIndex: 1 });
    res.json(movies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST: Create a new movie
exports.createMovie = async (req, res) => {
  try {
    const {
      title,
      releaseDate,
      genres,
      type,
      trailerUrl,
      sortIndex,
      month,
      language,
      platform,
      summary,
      cast,
      songs,
      rating // ✅ Added
    } = req.body;

    const posterUrl = `/uploads/${type === 'theatre' ? 'theatre-movies' : 'trailer-movies'}/${req.file.filename}`;

    const movie = new Movie({
      title,
      releaseDate,
      genres: JSON.parse(genres || '[]'),
      type,
      trailerUrl,
      posterUrl,
      sortIndex,
      month,
      language,
      platform,
      summary,
      cast: JSON.parse(cast || '[]'),
      songs: JSON.parse(songs || '[]'),
      rating: parseFloat(rating) || 0 // ✅ Safely parse rating
    });

    await movie.save();
    res.status(201).json(movie);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
};

// PUT: Update an existing movie
exports.updateMovie = async (req, res) => {
  try {
    const updateData = { ...req.body };

    // Optional: Handle new poster upload
    if (req.file) {
      const folder = updateData.type === 'theatre' ? 'theatre-movies' : 'trailer-movies';
      updateData.posterUrl = `/uploads/${folder}/${req.file.filename}`;
    }

    // Parse arrays if they come as JSON strings
    if (typeof updateData.genres === 'string') {
      updateData.genres = JSON.parse(updateData.genres);
    }
    if (typeof updateData.cast === 'string') {
      updateData.cast = JSON.parse(updateData.cast);
    }
    if (typeof updateData.songs === 'string') {
      updateData.songs = JSON.parse(updateData.songs);
    }

    // ✅ Safely parse rating
    if (updateData.rating) {
      updateData.rating = parseFloat(updateData.rating);
    }

    const updated = await Movie.findByIdAndUpdate(req.params.id, updateData, { new: true });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
};

// DELETE: Remove a movie
exports.deleteMovie = async (req, res) => {
  try {
    await Movie.findByIdAndDelete(req.params.id);
    res.json({ message: 'Movie deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
