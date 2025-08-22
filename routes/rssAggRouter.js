// routes/rssAggRouter.js
const express = require('express');
const axios = require('axios').default;
const RSSParser = require('rss-parser');

const router = express.Router();
const parser = new RSSParser({
  timeout: 15000,
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118 Safari/537.36',
    Accept: 'application/rss+xml, application/xml;q=0.9, */*;q=0.8',
  },
});

// ------------ config (env tunables) ------------------
const REFRESH_MS      = Number(process.env.RSS_AGG_REFRESH_MS || 120000); // 3 min
const PER_FEED_LIMIT  = Number(process.env.RSS_AGG_PER_FEED_LIMIT || 50);
const MAX_FEEDS       = Number(process.env.RSS_AGG_MAX_FEEDS || 200);
const CONCURRENCY     = Number(process.env.RSS_AGG_CONCURRENCY || 10);

// Try older pages for WordPress-like feeds to pull more than 10–20
const EXTRA_PAGES     = Number(process.env.RSS_AGG_EXTRA_PAGES || 3); // fetch paged=2..N
// Dedupe strategy
const DEDUPE_BY       = (process.env.RSS_AGG_DEDUPE_BY || 'link').toLowerCase(); // 'link' | 'link_or_title'

// Where to call our own /api/feeds. Prefer explicit SELF_BASE_URL.
const SELF_BASE = process.env.SELF_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;

// Warm categories at boot (comma-separated).
const WARM_CATS = (process.env.RSS_AGG_WARM_CATEGORIES || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// ------------- in-memory cache -----------------------
const cache = Object.create(null);

function now() { return Date.now(); }
function keyFor(category) {
  return (category || '').trim().toLowerCase() || '__all__';
}

// ---------- helpers ----------
function dedupe(items) {
  const out = [];
  const seen = new Set();
  for (const a of items) {
    const link = (a.link || '').trim();
    const title = (a.title || '').trim();
    const key = DEDUPE_BY === 'link' ? link : (link || title);
    if (!key) { out.push(a); continue; } // keep if no key
    if (!seen.has(key)) { seen.add(key); out.push(a); }
  }
  return out;
}

function pickImage(entry) {
  if (entry.enclosure && entry.enclosure.url) return entry.enclosure.url;
  if (entry.media && Array.isArray(entry.media.content)) {
    const m = entry.media.content.find((c) => c.url);
    if (m && m.url) return m.url;
  }
  if (entry.media && Array.isArray(entry.media.thumbnail)) {
    const t = entry.media.thumbnail.find((t) => t.url);
    if (t && t.url) return t.url;
  }
  const html = entry['content:encoded'] || entry.content || entry.summary || '';
  const m = typeof html === 'string' ? html.match(/<img[^>]+src=["']([^"']+)["']/i) : null;
  return m ? m[1] : '';
}

function toArticle(entry, feedTitle, feedUrl) {
  const link = (entry.link || '').trim();
  const title = (entry.title || '').trim();
  const desc = (entry.contentSnippet || entry.summary || entry.content || '').toString().trim();

  let publishedAt = null;
  if (entry.isoDate) {
    const d = new Date(entry.isoDate);
    if (!isNaN(d)) publishedAt = d.toISOString();
  } else if (entry.pubDate) {
    const d = new Date(entry.pubDate);
    if (!isNaN(d)) publishedAt = d.toISOString();
  }

  const imageUrl = pickImage(entry);

  return {
    id: link || title || feedUrl,
    title,
    description: desc,
    summary: desc,
    link,
    imageUrl,
    source: feedTitle || '',
    category: '',
    author: entry.creator || entry.author || '',
    publishedAt,
    parsedDate: publishedAt,
    pubDate: publishedAt ? publishedAt.split('T')[0] : '',
    pubTime: publishedAt ? (publishedAt.split('T')[1] || '').split('.')[0] : '',
  };
}

// IMPORTANT: match by category/label/name/city/state
async function getFeedUrls(category) {
  // Fetch all feeds and filter locally so we can match on city/state too.
  const params = new URLSearchParams({ page: '1', pageSize: '500' });
  const url = `${SELF_BASE}/api/feeds?${params.toString()}`;

  const { data } = await axios.get(url, { timeout: 15000 });
  if (!Array.isArray(data)) return [];

  const needle = (category || '').trim().toLowerCase();

  const urls = [];
  for (const row of data) {
    const enabled = row.enabled === undefined ? true : !!row.enabled;
    if (!enabled) continue;

    const u = (row.url || '').toString().trim();
    if (!u) continue;

    // fields considered for matching the requested "category"
    const fields = [
      row.category,  // e.g. "Finance"
      row.label,     // e.g. "Ahmedabad"
      row.name,      // sometimes used
      row.city,      // e.g. "Bengaluru"
      row.state,     // e.g. "Karnataka"
    ]
      .map(v => String(v || '').trim().toLowerCase())
      .filter(Boolean);

    const match = !needle || fields.includes(needle);
    if (match) urls.push(u);
  }

  return urls.slice(0, MAX_FEEDS);
}

function isWordPressLike(u) {
  return /\/feed(\b|\/)|feed=rss/i.test(u) || /wordpress/i.test(u);
}

function makePagedVariants(u, maxPage) {
  // WP typically supports: /feed/?paged=2  or ?paged=2
  const out = [];
  for (let p = 2; p <= maxPage; p++) {
    if (/\?/.test(u)) {
      out.push(`${u}&paged=${p}`);
    } else if (/\/feed\/?$/.test(u)) {
      out.push(u.replace(/\/?$/, '/?paged=' + p));
    } else {
      out.push(`${u}?paged=${p}`);
    }
  }
  return out;
}

async function fetchSingle(u) {
  try {
    const feed = await parser.parseURL(u);
    const title = feed.title || '';
    const items = (feed.items || []).map((it) => toArticle(it, title, u));
    return items;
  } catch (e) {
    console.error('[rss-agg] feed fail:', u, e.message || e);
    return [];
  }
}

async function fetchOneFeedAll(u, perFeedLimit) {
  // First page
  let items = await fetchSingle(u);

  // Extra pages (older posts) for WordPress-like feeds
  if (EXTRA_PAGES > 0 && isWordPressLike(u)) {
    const variants = makePagedVariants(u, EXTRA_PAGES + 1); // adds paged=2..N
    for (const v of variants) {
      const more = await fetchSingle(v);
      items.push(...more);
    }
  }

  // Trim per-feed
  return items.slice(0, perFeedLimit);
}

async function fetchAllFeeds(urls, perFeedLimit) {
  const out = [];
  let i = 0;
  async function next() {
    if (i >= urls.length) return;
    const u = urls[i++];
    const items = await fetchOneFeedAll(u, perFeedLimit);
    out.push(...items);
    return next();
  }
  const workers = Array.from({ length: Math.min(CONCURRENCY, urls.length) }, next);
  await Promise.all(workers);
  return out;
}

async function rebuildCategory(category) {
  const k = keyFor(category);
  if (!cache[k]) cache[k] = { items: [], updatedAt: 0, refreshing: false };
  if (cache[k].refreshing) return cache[k];

  cache[k].refreshing = true;
  try {
    const urls = await getFeedUrls(category);
    const items = await fetchAllFeeds(urls, PER_FEED_LIMIT);

    items.sort((a, b) => {
      const da = a.publishedAt ? Date.parse(a.publishedAt) : 0;
      const db = b.publishedAt ? Date.parse(b.publishedAt) : 0;
      return db - da;
    });

    cache[k].items = dedupe(items);
    cache[k].updatedAt = now();
    return cache[k];
  } finally {
    cache[k].refreshing = false;
    setTimeout(() => {
      rebuildCategory(category).catch((e) =>
        console.error('[rss-agg] refresh error:', category, e.message || e)
      );
    }, REFRESH_MS);
  }
}

// ------------- routes -------------------------------
router.get('/', async (req, res) => {
  try {
    const category = (req.query.category || '').toString();
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const pageSize = Math.max(1, Math.min(2000, parseInt(req.query.pageSize || '20', 10)));

    // allow per-request overrides (optional)
    if (req.query.perFeedLimit) {
      process.env.RSS_AGG_PER_FEED_LIMIT = String(parseInt(req.query.perFeedLimit, 10) || PER_FEED_LIMIT);
    }
    if (req.query.maxFeeds) {
      process.env.RSS_AGG_MAX_FEEDS = String(parseInt(req.query.maxFeeds, 10) || MAX_FEEDS);
    }

    const k = keyFor(category);
    const entry = cache[k];

    const STALE = !entry || now() - (entry.updatedAt || 0) > REFRESH_MS * 1.2;
    if (STALE) {
      rebuildCategory(category).catch((e) =>
        console.error('[rss-agg] on-demand refresh error:', category, e.message || e)
      );
    }

    const items = (entry && entry.items) || [];
    const start = (page - 1) * pageSize;
    const slice = items.slice(start, start + pageSize);

    res.json({
      items: slice,
      total: items.length,
      updatedAt: entry ? entry.updatedAt : 0,
      stale: STALE,
    });
  } catch (e) {
    console.error('[rss-agg] handler fail:', e);
    res.status(500).json({ error: 'rss-agg failed' });
  }
});

// ------------- warmup -------------------------------
async function warm() {
  if (!WARM_CATS.length) return;
  console.log('[rss-agg] warm categories:', WARM_CATS.join(', '));
  for (const c of WARM_CATS) {
    try {
      await rebuildCategory(c);
      console.log('[rss-agg] warmed:', c, 'items:', cache[keyFor(c)].items.length);
    } catch (e) {
      console.error('[rss-agg] warm fail:', c, e.message || e);
    }
  }
}
warm().catch(() => {});

module.exports = router;
