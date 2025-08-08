// server.js
require("dotenv").config(); // load env first

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

// Routers
const adsRouter = require("./routes/adsRouter");
const movieRouter = require("./routes/movieRouter");
const moviePromoBannerRouter = require("./routes/moviePromoBannerRouter");
const feedRouter = require("./routes/feedRouter");
const shortsRouter = require("./routes/shortsRouter");
const tweetsRouter = require("./routes/tweetsRouter");

// DB
const connectDB = require("./db");

const app = express();
const PORT = process.env.PORT || 5000;

/* ---------------- CORS (env allowlist) ----------------
   Set CORS_ORIGINS in Render env as a comma-separated list, e.g.:
   CORS_ORIGINS=https://ad-admin-panel-eta.vercel.app,http://localhost:3000
-------------------------------------------------------- */
const allowlist = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

app.use(
  cors(
    allowlist.length
      ? {
          origin(origin, cb) {
            // allow no-origin (curl/Postman) and allowlisted origins
            if (!origin || allowlist.includes(origin)) return cb(null, true);
            return cb(new Error("Not allowed by CORS"));
          },
          credentials: false,
        }
      : {} // open CORS if no allowlist set
  )
);

// Trust Render/other proxies (optional but handy)
app.set("trust proxy", 1);

// Body parsing
app.use(express.json({ limit: "2mb" }));

/* ----------- Ensure upload dirs exist & static ---------- */
const baseUploadDir = path.join(__dirname, "uploads");
const promoDir = path.join(baseUploadDir, "movie-banners");
fs.mkdirSync(promoDir, { recursive: true });

// Serve uploads publicly (so posterUrl works)
app.use("/uploads", express.static(baseUploadDir));
/* -------------------------------------------------------- */

// Connect DB
connectDB();

/* ----------------------- Routes ------------------------ */
app.use("/api/ads", adsRouter);
app.use("/api", movieRouter); // movies (in theatres + trailers)
app.use("/api/movie-banners", moviePromoBannerRouter);
app.use("/api/feeds", feedRouter);
app.use("/api/shorts", shortsRouter);
app.use("/api/tweets", tweetsRouter);
/* ------------------------------------------------------ */

// Health checks
app.get("/", (_req, res) => res.send("✅ Ad Server Running"));
app.get("/healthz", (_req, res) => res.status(200).json({ ok: true }));

// 404
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Error handler
app.use((err, _req, res, _next) => {
  console.error("Server error:", err);
  res.status(500).json({ error: "Server error" });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Ad Server listening on port ${PORT}`);
});
