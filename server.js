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

/* -------------------- CORS (robust allowlist) --------------------
   Put your allowed origins in the Render env var CORS_ORIGINS as a
   SINGLE comma-separated line. Example:

   CORS_ORIGINS=https://ad-admin-panel-eta.vercel.app,https://ad-admin-panel-git-main-vermaraghav18s-projects.vercel.app

   Notes:
   - We also always allow http://localhost:3000 for dev
   - We tolerate accidental spaces/newlines in the env var
   - Supports wildcard entries like "https://*.vercel.app" if you
     want to allow all preview URLs (optional)
------------------------------------------------------------------ */
function parseAllowlist(input) {
  return (input || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
}

// read env, tolerate newlines
const allowlist = parseAllowlist(process.env.CORS_ORIGINS);

// always allow localhost for dev
if (!allowlist.includes("http://localhost:3000")) {
  allowlist.push("http://localhost:3000");
}

// helper: does origin match an entry (supports wildcard "*.domain.tld")
function matchesOrigin(origin, entry) {
  if (!origin) return true; // no Origin header (e.g. curl/Postman) → allow
  try {
    const o = new URL(origin);
    const e = new URL(entry.replace("*.", "")); // normalize for scheme
    const wildcard = entry.includes("*.");
    const sameScheme = o.protocol === e.protocol;
    if (!sameScheme) return false;

    if (wildcard) {
      // allow any subdomain of e.hostname
      return o.hostname === e.hostname || o.hostname.endsWith("." + e.hostname);
    }
    // exact match
    return origin === entry;
  } catch {
    // fallback: strict equality
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

// log the active allowlist once on boot
console.log("[CORS] allowlist:", allowlist);

// preflight first, then main CORS
app.options("*", cors(corsOptions));
app.use(cors(corsOptions));

// Trust Render/other proxies (optional)
app.set("trust proxy", 1);

// Body parsing
app.use(express.json({ limit: "2mb" }));

/* ----------- Ensure upload dirs exist & static ---------- */
const baseUploadDir = path.join(__dirname, "uploads");
const promoDir = path.join(baseUploadDir, "movie-banners");
fs.mkdirSync(promoDir, { recursive: true });

// Serve uploads publicly (so posterUrl works if any local files exist)
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
