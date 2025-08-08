// server.js
require("dotenv").config(); // ← load .env first

const express = require("express");
const cors = require("cors");
const path = require("path");

const adsRouter = require("./routes/adsRouter");
const movieRouter = require("./routes/movieRouter");
const moviePromoBannerRouter = require("./routes/moviePromoBannerRouter");
const feedRouter = require("./routes/feedRouter");
const shortsRouter = require("./routes/shortsRouter");
const tweetsRouter = require("./routes/tweetsRouter");

const connectDB = require("./db");

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB (uses MONGO_URI from .env)
connectDB();

// Middleware
app.use(cors()); // you can tighten this later with origin: [...]
app.use(express.json({ limit: "1mb" }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use("/api/ads", adsRouter);
app.use("/api", movieRouter); // movies (in theatres + trailers)
app.use("/api/movie-banners", moviePromoBannerRouter);
app.use("/api/feeds", feedRouter);
app.use("/api/shorts", shortsRouter);
app.use("/api/tweets", tweetsRouter);

// Health check
app.get("/", (_req, res) => {
  res.send("✅ Ad Server Running");
});

// 404 (optional but handy)
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Error handler (optional)
app.use((err, _req, res, _next) => {
  console.error("Server error:", err);
  res.status(500).json({ error: "Server error" });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Ad Server running at http://localhost:${PORT}`);
});
