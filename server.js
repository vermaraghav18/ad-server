// server.js

// --- Prefer IPv4 everywhere to avoid ENETUNREACH on IPv6-only routes -----
const dns = require('node:dns');
const http = require('node:http');
const https = require('node:https');

try {
  dns.setDefaultResultOrder('ipv4first');
} catch {}

const originalLookup = dns.lookup;
function ipv4Lookup(hostname, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  return originalLookup(hostname, { ...options, family: 4, all: false }, callback);
}
http.globalAgent.options.lookup = ipv4Lookup;
https.globalAgent.options.lookup = ipv4Lookup;
http.globalAgent.options.family = 4;
https.globalAgent.options.family = 4;
// ------------------------------------------------------------------------

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const compression = require('compression');
const apicache = require('apicache');

// Routers
const adsRouter = require('./routes/adsRouter');
const movieRouter = require('./routes/movieRouter');
const moviePromoBannerRouter = require('./routes/moviePromoBannerRouter');
const smallAdRouter = require('./routes/smallAdRouter');
const feedRouter = require('./routes/feedRouter');
const shortsRouter = require('./routes/shortsRouter');
const tweetsRouter = require('./routes/tweetsRouter');
const customNewsRouter = require('./routes/customNewsRouter');
const extractRouter = require('./routes/extractRouter');
const newsHubRouter = require('./routes/newsHubRouter');
const liveBannerRouter = require('./routes/liveBannerRouter');
const bannerWithArticleRouter = require('./routes/bannerWithArticleRouter');
const uploadRouter = require('./routes/uploadRouter');
const liveUpdateHubRouter = require('./routes/liveUpdateHubRouter');
const rssAggRouter = require('./routes/rssAggRouter');
const bannerConfigRouter = require('./routes/bannerConfigRouter');
const featureBannerGroupRouter = require('./routes/featureBannerGroupRouter');

const sectionsRouter = require('./routes/sectionsRouter');

const cartoonRouter = require('./routes/cartoonRouter');

const { get: outboundGet } = require('./request');
const connectDB = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

/* -------------------- CORS (robust allowlist) -------------------- */
function parseAllowlist(input) {
  return (input || '').split(',').map((s) => s.trim()).filter(Boolean);
}
const allowlist = parseAllowlist(process.env.CORS_ORIGINS);
if (!allowlist.includes('http://localhost:3000')) {
  allowlist.push('http://localhost:3000');
}
function matchesOrigin(origin, entry) {
  if (!origin) return true;
  try {
    const o = new URL(origin);
    const e = new URL(entry.replace('*.', ''));
    const wildcard = entry.includes('*.');
    const sameScheme = o.protocol === e.protocol;
    if (!sameScheme) return false;
    if (wildcard) {
      return o.hostname === e.hostname || o.hostname.endsWith('.' + e.hostname);
    }
    return origin === entry;
  } catch {
    return origin === entry;
  }
}
const corsOptions = {
  origin(origin, cb) {
    const ok = allowlist.some((entry) => matchesOrigin(origin, entry));
    if (ok) return cb(null, true);
    console.error('[CORS] blocked origin:', origin, 'allowlist:', allowlist);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
};
console.log('[CORS] allowlist:', allowlist);

app.use(cors(corsOptions));
app.set('trust proxy', 1);
app.use(express.json({ limit: '5mb' }));

/* ----------- Ensure upload dirs exist & static ---------- */
const baseUploadDir = path.join(__dirname, 'uploads');
const promoDir = path.join(baseUploadDir, 'movie-banners');
fs.mkdirSync(promoDir, { recursive: true });
app.use('/uploads', express.static(baseUploadDir));
/* -------------------------------------------------------- */

app.use(compression({ level: 6 }));
const cache = apicache.options({ respectCacheControl: true }).middleware;

// DB
connectDB();

/* ----------------------- Routes ------------------------ */
app.use('/api/ads', adsRouter);
app.use('/api', movieRouter);
app.use('/api/movie-banners', moviePromoBannerRouter);
app.use('/api/small-ads', smallAdRouter);
app.use('/api/feeds', cache('30 seconds'), feedRouter);
app.use('/api/shorts', shortsRouter);
app.use('/api/tweets', tweetsRouter);
app.use('/api/custom-news', cache('20 seconds'), customNewsRouter);
app.use('/api/extract', extractRouter);
app.use('/api/news-hub', newsHubRouter);
app.use('/api/live-banners', liveBannerRouter);
app.use('/api/banners', bannerWithArticleRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/live-update-hub', liveUpdateHubRouter);
app.use('/api/rss-agg', cache('30 seconds'), rssAggRouter);
app.use('/api/banner-configs', bannerConfigRouter);
app.use('/api/feature-banner-groups', featureBannerGroupRouter);

app.use('/api/cartoons', cartoonRouter);


app.use('/api/sections', sectionsRouter);

/* -------- Optional probe for outbound debugging ---------- */
app.get('/api/_probe', async (req, res) => {
  const url = req.query.url || 'https://example.com/';
  try {
    const r = await outboundGet(url, { responseType: 'text' });
    const len =
      typeof r.data === 'string'
        ? r.data.length
        : Buffer.isBuffer(r.data)
        ? r.data.length
        : 0;
    res.status(200).json({ url, status: r.status, length: len });
  } catch (e) {
    res.status(502).json({ url, error: e.code || 'UNKNOWN', message: e.message || String(e) });
  }
});

app.get('/', (_req, res) => res.send('✅ Ad Server Running'));
app.get('/healthz', (_req, res) => res.status(200).json({ ok: true }));

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, _req, res, _next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Server error' });
});

app.listen(PORT, () => {
  console.log(`✅ Ad Server listening on port ${PORT}`);
  console.log('➡️  Mounted routes:');
  console.log('   • /api/ads');
  console.log('   • /api (movies)');
  console.log('   • /api/movie-banners');
  console.log('   • /api/small-ads');
  console.log('   • /api/feeds  (cached 30s)');
  console.log('   • /api/shorts');
  console.log('   • /api/tweets');
  console.log('   • /api/custom-news  (cached 20s)');
  console.log('   • /api/extract');
  console.log('   • /api/news-hub');
  console.log('   • /api/live-banners');
  console.log('   • /api/banners');
  console.log('   • /api/live-update-hub');
  console.log('   • /api/rss-agg  (cached 30s)');
  console.log('   • /api/banner-configs');
  console.log('   • /api/feature-banner-groups');
  console.log('   • /api/sections');
  console.log('   • /api/_probe  (optional outbound tester)');
});
