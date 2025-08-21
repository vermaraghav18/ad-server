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
const REFRESH_MS = Number(process.env.RSS_AGG_REFRESH_MS || 180000); // 3 min
const PER_FEED_LIMIT = Number(process.env.RSS_AGG_PER_FEED_LIMIT || 30);
const MAX_FEEDS       = Number(process.env.RSS_AGG_MAX_FEEDS || 50);
const CONCURRENCY     = Number(process.env.RSS_AGG_CONCURRENCY || 8);

// Where to call our own /api/feeds. Prefer explicit SELF_BASE_URL.
const SELF_BASE =
  process.env.SELF_BASE_URL ||
  `http://localhost:${process.env.PORT || 5000}`;

// Warm categories at boot (comma-separated). Example: "Top News,Tamil Nadu"
const WARM_CATS = (process.env.RSS_AGG_WARM_CATEGORIES || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// ------------- in-memory cache -----------------------
/**
 * cache = {
 *   "<categoryKey>": { items: [...], updatedAt: 123456789, refreshing: false }
 * }
 */
const cache = Object.create(null);

// ------------- helpers -------------------------------
function now() { return Date.now(); }

function keyFor(category) {
  return (category || '').trim().toLowerCase() || '__all__';
}

function dedupeByLink(items) {
  const seen = new Set();
  const out = [];
  for (const a of items) {
    const k = (a.link && a.link.trim()) || (a.title && a.title.trim());
    if (!k) continue;
    if (!seen.has(k)) {
      seen.add(k);
      out.push(a);
    }
  }
  return out;
}

function pickImage(entry) {
  // try enclosure, media:content, media:thumbnail, or <img> in content:encoded
  if (entry.enclosure && entry.enclosure.url) return entry.enclosure.url;
  if (entry.media && Array.isArray(entry.media.content) && entry.media.content.length) {
    const m = entry.media.content.find((c) => c.url);
    if (m && m.url) return m.url;
  }
  if (entry.media && Array.isArray(entry.media.thumbnail) && entry.media.thumbnail.length) {
    const t = entry.media.thumbnail.find((t) => t.url);
    if (t && t.url) return t.url;
  }
  const html = entry['content:encoded'] || entry.content || entry.summary || '';
  const m = typeof html === 'string'
    ? html.match(/<img[^>]+src=["']([^"']+)["']/i)
    : null;
  return m ? m[1] : '';
}

function toArticle(entry, feedTitle, feedUrl) {
  const link = (entry.link || '').trim();
  const title = (entry.title || '').trim();
  const desc = (entry.contentSnippet || entry.summary || entry.content || '').toString().trim();

  // pubDate: rss-parser gives isoDate or pubDate
  let publishedAt = null;
  if (entry.isoDate) {
    const d = new Date(entry.isoDate);
    if (!isNaN(d)) publishedAt = d.toISOString();
  } else if (entry.pubDate) {
    const d = new Date(entry.pubDate);
    if (!isNaN(d)) publishedAt = d.toISOString();
  }

  const imageUrl = pickImage(entry);

  // shape matches your Flutter Article.fromJson mapper expectations
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
    // legacy-friendly:
    pubDate: publishedAt ? publishedAt.split('T')[0] : '',
    pubTime: publishedAt ? (publishedAt.split('T')[1] || '').split('.')[0] : '',
  };
}

async function getFeedUrls(category) {
  // Ask our own /api/feeds (works with your existing router)
  const params = new URLSearchParams({ page: '1', pageSize: '200' });
  if (category && category.trim()) params.set('category', category.trim());
  const url = `${SELF_BASE}/api/feeds?${params.toString()}`;

  const { data } = await axios.get(url, { timeout: 15000 });
  if (!Array.isArray(data)) return [];

  const urls = [];
  for (const row of data) {
    const enabled = row.enabled === undefined ? true : !!row.enabled;
    const u = (row.url || '').toString();
    const label = (row.label || '').toString();
    const match =
      !category ||
      !category.trim() ||
      row.category === category ||
      label === category;

    if (enabled && u) urls.push(u);
  }
  // Trim to MAX_FEEDS (safety)
  return urls.slice(0, MAX_FEEDS);
}

async function fetchOneFeed(u, perFeedLimit) {
  try {
    const feed = await parser.parseURL(u);
    const title = feed.title || '';
    const items = (feed.items || []).slice(0, perFeedLimit).map((it) => toArticle(it, title, u));
    return items;
  } catch (e) {
    console.error('[rss-agg] feed fail:', u, e.message || e);
    return [];
  }
}

async function fetchAllFeeds(urls, perFeedLimit) {
  const out = [];
  // simple concurrency control
  let i = 0;
  async function next() {
    if (i >= urls.length) return;
    const u = urls[i++];
    const items = await fetchOneFeed(u, perFeedLimit);
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

    // sort newest first
    items.sort((a, b) => {
      const da = a.publishedAt ? Date.parse(a.publishedAt) : 0;
      const db = b.publishedAt ? Date.parse(b.publishedAt) : 0;
      return db - da;
    });

    cache[k].items = dedupeByLink(items);
    cache[k].updatedAt = now();
    return cache[k];
  } finally {
    cache[k].refreshing = false;
    // schedule next refresh
    setTimeout(() => {
      rebuildCategory(category).catch((e) =>
        console.error('[rss-agg] refresh error:', category, e.message || e)
      );
    }, REFRESH_MS);
  }
}

// ------------- routes -------------------------------

/**
 * GET /api/rss-agg
 * Query: category, page=1, pageSize=20
 * Optional: perFeedLimit (overrides env), maxFeeds (overrides env)
 */
router.get('/', async (req, res) => {
  try {
    const category = (req.query.category || '').toString();
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const pageSize = Math.max(1, Math.min(1000, parseInt(req.query.pageSize || '20', 10)));

    // allow per-request overrides (optional)
    if (req.query.perFeedLimit) {
      process.env.RSS_AGG_PER_FEED_LIMIT = String(parseInt(req.query.perFeedLimit, 10) || PER_FEED_LIMIT);
    }
    if (req.query.maxFeeds) {
      process.env.RSS_AGG_MAX_FEEDS = String(parseInt(req.query.maxFeeds, 10) || MAX_FEEDS);
    }

    const k = keyFor(category);
    const entry = cache[k];

    // If no cache yet or stale, kick off rebuild (but serve stale/empty immediately)
    const STALE = !entry || now() - (entry.updatedAt || 0) > REFRESH_MS * 1.2;
    if (STALE) {
      rebuildCategory(category).catch((e) =>
        console.error('[rss-agg] on-demand refresh error:', category, e.message || e)
      );
    }

    const items = (entry && entry.items) || [];
    const start = (page - 1) * pageSize;
    const slice = items.slice(start, start + pageSize);

    // Respond in a shape your Flutter already understands
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
