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

// Helper to safely parse JSON-ish fields (can be array already or JSON string)
function parseJson(val, fallback) {
  if (val == null || val === '') return fallback;
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val); } catch { return fallback; }
}

// POST: Create a new movie (robust, matches schema)
exports.createMovie = async (req, res) => {
  try {
    // poster is required (multer.single('poster'))
    if (!req.file) {
      return res.status(400).json({ error: "Poster image is required (field name: 'poster')." });
    }

    // pull fields from body
    let {
      title,
      releaseDate,   // <-- must be a non-empty string (schema requires String)
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
      rating,
    } = req.body;

    // validate releaseDate (string, required)
    const releaseDateStr = (releaseDate || '').toString().trim();
    if (!releaseDateStr) {
      return res.status(400).json({ error: 'releaseDate is required (string).' });
    }

    // normalize type to 'theatre' | 'trailer'
    const safeType = String(type || 'theatre').toLowerCase() === 'trailer' ? 'trailer' : 'theatre';

    // arrays
    const genresArr = parseJson(genres, []);
    const castArr   = parseJson(cast,   []);
    const songsArr  = parseJson(songs,  []);

    // numbers
    const ratingNum    = Number.parseFloat(rating);
    const sortIndexNum = Number.parseInt(sortIndex, 10);
    const safeRating   = Number.isFinite(ratingNum) ? ratingNum : 0;
    const safeSortIdx  = Number.isFinite(sortIndexNum) ? sortIndexNum : 0;

    // poster URL saved as string path (served by /uploads)
    const posterUrl = `/uploads/${safeType === 'theatre' ? 'theatre-movies' : 'trailer-movies'}/${req.file.filename}`;

    const movie = new Movie({
      title: (title || '').trim(),
      releaseDate: releaseDateStr,    // <-- STRING (matches schema)
      genres: genresArr,
      posterUrl,
      trailerUrl: trailerUrl || '',
      type: safeType,
      enabled: true,
      sortIndex: safeSortIdx,

      // optional UI fields
      month: month || '',
      language: language || '',
      platform: platform || '',
      summary: summary || '',
      cast: castArr,
      songs: songsArr,
      rating: safeRating, // number 0..10
    });

    await movie.save();
    return res.status(201).json(movie);
  } catch (err) {
    console.error('❌ createMovie error:', err);
    return res.status(400).json({ error: String(err.message || err) });
  }
};

// PUT: Update an existing movie
exports.updateMovie = async (req, res) => {
  try {
    const updateData = { ...req.body };

    // if new poster uploaded, update its URL
    if (req.file) {
      const t = (updateData.type || 'theatre').toString().toLowerCase();
      const folder = t === 'trailer' ? 'trailer-movies' : 'theatre-movies';
      updateData.posterUrl = `/uploads/${folder}/${req.file.filename}`;
    }

    // keep releaseDate as STRING to match schema (only trim if provided)
    if (updateData.releaseDate != null) {
      updateData.releaseDate = updateData.releaseDate.toString().trim();
      if (!updateData.releaseDate) {
        return res.status(400).json({ error: 'releaseDate cannot be empty.' });
      }
    }

    // normalize type if provided
    if (updateData.type != null) {
      updateData.type = updateData.type.toString().toLowerCase() === 'trailer' ? 'trailer' : 'theatre';
    }

    // parse arrays if they came as JSON strings
    if (typeof updateData.genres === 'string') {
      try { updateData.genres = JSON.parse(updateData.genres); } catch { updateData.genres = []; }
    }
    if (typeof updateData.cast === 'string') {
      try { updateData.cast = JSON.parse(updateData.cast); } catch { updateData.cast = []; }
    }
    if (typeof updateData.songs === 'string') {
      try { updateData.songs = JSON.parse(updateData.songs); } catch { updateData.songs = []; }
    }

    // coerce numbers if provided
    if (updateData.rating != null) {
      const r = Number.parseFloat(updateData.rating);
      updateData.rating = Number.isFinite(r) ? r : 0;
    }
    if (updateData.sortIndex != null) {
      const s = Number.parseInt(updateData.sortIndex, 10);
      updateData.sortIndex = Number.isFinite(s) ? s : 0;
    }

    const updated = await Movie.findByIdAndUpdate(req.params.id, updateData, { new: true });
    return res.json(updated);
  } catch (err) {
    console.error('❌ updateMovie error:', err);
    return res.status(400).json({ error: err.message });
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
