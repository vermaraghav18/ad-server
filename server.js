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
const customNewsRouter = require('./routes/customNewsRouter');
const extractRouter = require('./routes/extractRouter');
// DB
const connectDB = require("./db");

const app = express();
const PORT = process.env.PORT || 5000;

/* -------------------- CORS (robust allowlist) -------------------- */
function parseAllowlist(input) {
  return (input || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
}

const allowlist = parseAllowlist(process.env.CORS_ORIGINS);

// always allow localhost for dev
if (!allowlist.includes("http://localhost:3000")) {
  allowlist.push("http://localhost:3000");
}

function matchesOrigin(origin, entry) {
  if (!origin) return true; // allow non-browser requests (no Origin)
  try {
    const o = new URL(origin);
    const e = new URL(entry.replace("*.", ""));
    const wildcard = entry.includes("*.");
    const sameScheme = o.protocol === e.protocol;
    if (!sameScheme) return false;
    if (wildcard) {
      return o.hostname === e.hostname || o.hostname.endsWith("." + e.hostname);
    }
    return origin === entry;
  } catch {
    return origin === entry;
  }
}

const corsOptions = {
  origin(origin, cb) {
    const ok = allowlist.some(entry => matchesOrigin(origin, entry));
    if (ok) return cb(null, true);
    console.error("[CORS] blocked origin:", origin, "allowlist:", allowlist);
    return cb(new Error("Not allowed by CORS"));
  },
  credentials: true,
};

console.log("[CORS] allowlist:", allowlist);

// ✅ Global CORS (preflight handled here too)
app.use(cors(corsOptions));

app.set("trust proxy", 1);
app.use(express.json({ limit: "2mb" }));

/* ----------- Ensure upload dirs exist & static ---------- */
const baseUploadDir = path.join(__dirname, "uploads");
const promoDir = path.join(baseUploadDir, "movie-banners");
fs.mkdirSync(promoDir, { recursive: true });
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
app.use('/api/custom-news', customNewsRouter);
app.use('/api/extract', extractRouter);
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

app.listen(PORT, () => {
  console.log(`✅ Ad Server listening on port ${PORT}`);
});
