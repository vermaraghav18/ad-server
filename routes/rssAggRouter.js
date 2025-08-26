// routes/rssAggRouter.js  — server-driven feed + banner injections (article-anchored)

const express = require('express');
const axios = require('axios').default;
const RSSParser = require('rss-parser');
const crypto = require('crypto');
const path = require('path');

/* -------------------- optional models -------------------- */
let BannerConfig = null;
try {
  BannerConfig = require('../models/BannerConfig');
} catch {
  console.warn('[rss-agg] BannerConfig model not found; injections disabled');
}

/** Only require a module if it truly exists on disk (avoids editor/linter errors). */
function safeRequire(p) {
  try {
    const resolved = require.resolve(p);
    // eslint-disable-next-line import/no-dynamic-require, global-require
    return require(resolved);
  } catch {
    return null;
  }
}

const router = express.Router();
const parser = new RSSParser({
  timeout: 15000,
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118 Safari/537.36',
    Accept: 'application/rss+xml, application/xml;q=0.9, */*;q=0.8',
  },
});

/* -------------------- config (env tunables) -------------------- */
const REFRESH_MS     = Number(process.env.RSS_AGG_REFRESH_MS || 120000); // 2 min
const PER_FEED_LIMIT = Number(process.env.RSS_AGG_PER_FEED_LIMIT || 50);
const MAX_FEEDS      = Number(process.env.RSS_AGG_MAX_FEEDS || 200);
const CONCURRENCY    = Number(process.env.RSS_AGG_CONCURRENCY || 10);

const EXTRA_PAGES    = Number(process.env.RSS_AGG_EXTRA_PAGES || 3); // fetch paged=2..N
const DEDUPE_BY      = (process.env.RSS_AGG_DEDUPE_BY || 'link').toLowerCase(); // 'link' | 'link_or_title'

// Where to call our own /api/feeds. Prefer explicit SELF_BASE_URL in prod.
const SELF_BASE = process.env.SELF_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;

// Warm categories at boot (comma-separated).
const WARM_CATS = (process.env.RSS_AGG_WARM_CATEGORIES || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

/* -------------------- in-memory cache -------------------- */
const cache = Object.create(null);

function now() { return Date.now(); }
function keyFor(category) {
  return (category || '').trim().toLowerCase() || '__all__';
}

/* -------------------- helpers -------------------- */
function sha1(s) {
  return crypto.createHash('sha1').update(String(s)).digest('hex').slice(0, 20);
}

function stableArticleId(entry, feedUrl) {
  // Prefer link, then guid, else title+feed fallback
  const link = (entry.link || '').trim();
  const guid = (entry.guid || '').toString().trim();
  const title = (entry.title || '').trim();
  const base = link || guid || (title && feedUrl ? `${title}|${feedUrl}` : feedUrl);
  return sha1(base || Math.random().toString(36));
}

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

function toArticle(entry, feedTitle, feedUrl, forcedCategory = '') {
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
  const id = stableArticleId(entry, feedUrl);

  return {
    id, // ✅ stable id
    title,
    description: desc,
    summary: desc,
    link,
    imageUrl,
    source: feedTitle || '',
    category: forcedCategory || '', // ✅ helps category fallbacks
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
    const items = (feed.items || []).map((it) => toArticle(it, title, u /* feedUrl */));
    return items;
  } catch (e) {
    console.error('[rss-agg] feed fail:', u, e.message || e);
    return [];
  }
}

async function fetchOneFeedAll(u, perFeedLimit, forcedCategory = '') {
  // First page
  let items = await fetchSingle(u);
  if (forcedCategory) {
    items = items.map(a => ({ ...a, category: forcedCategory }));
  }

  // Extra pages (older posts) for WordPress-like feeds
  if (EXTRA_PAGES > 0 && isWordPressLike(u)) {
    const variants = makePagedVariants(u, EXTRA_PAGES + 1); // adds paged=2..N
    for (const v of variants) {
      let more = await fetchSingle(v);
      if (forcedCategory) {
        more = more.map(a => ({ ...a, category: forcedCategory }));
      }
      items.push(...more);
    }
  }

  // Trim per-feed
  return items.slice(0, perFeedLimit);
}

async function fetchAllFeeds(urls, perFeedLimit, forcedCategory = '') {
  const out = [];
  let i = 0;
  async function next() {
    if (i >= urls.length) return;
    const u = urls[i++];
    const items = await fetchOneFeedAll(u, perFeedLimit, forcedCategory);
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
    const items = await fetchAllFeeds(urls, PER_FEED_LIMIT, category || '');

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

/** Resolve banner injections against the given article list.
 *  Supports new `anchor` shape, plus legacy: startAfter/repeatEvery/customNewsId/imageUrl.
 */
async function resolveInjections(articles, category) {
  if (!BannerConfig) return [];
  const nowDt = new Date();

  // Load active configs
  const banners = await BannerConfig.find({
    $and: [
      { $or: [{ isActive: { $exists: false } }, { isActive: true }] },
      { $or: [{ activeFrom: { $exists: false } }, { activeFrom: { $lte: nowDt } }] },
      { $or: [{ activeTo: { $exists: false } }, { activeTo: null }, { activeTo: { $gte: nowDt } }] },
    ],
  })
    .sort({ priority: -1 })
    .lean();

  if (!banners.length) return [];

  // optional: resolve CustomNews docs for payloads (only if model file exists)
  const CustomNews = safeRequire(path.join(__dirname, '..', 'models', 'CustomNews'));
  const newsIdSet = new Set();
  for (const b of banners) {
    const id = b.payload?.customNewsId || b.customNewsId;
    if (id) newsIdSet.add(String(id));
  }

  let newsDocsById = new Map();
  if (CustomNews && newsIdSet.size) {
    const docs = await CustomNews.find({ _id: { $in: Array.from(newsIdSet) } })
      .select('title headline imageUrl thumbUrl link url slug deeplink createdAt updatedAt')
      .lean();
    newsDocsById = new Map(docs.map(d => [String(d._id), d]));
  }

  const idxById = new Map(articles.map((a, i) => [a.id, i]));
  const topIdxByCat = new Map();
  for (let i = 0; i < articles.length; i++) {
    const c = (articles[i].category || '').toLowerCase();
    if (c && !topIdxByCat.has(c)) topIdxByCat.set(c, i);
  }

  const injections = [];

  const pushInjection = (afterId, bannerDoc) => {
    const mode = bannerDoc.mode || bannerDoc.type || (bannerDoc.customNewsId ? 'news' : 'ad');
    // build payload (prefer structured 'payload')
    let payload = bannerDoc.payload || {};
    if (!payload || Object.keys(payload).length === 0) {
      // synthesize from legacy fields
      if (mode === 'ad') {
        payload = {
          imageUrl: bannerDoc.imageUrl,
          clickUrl: bannerDoc.clickUrl || bannerDoc.targetUrl || bannerDoc.deeplinkUrl,
        };
      } else if (mode === 'news') {
        const nid = String(bannerDoc.customNewsId || '');
        const doc = nid && newsDocsById.get(nid);
        payload = {
          headline: doc?.headline || doc?.title || bannerDoc.message || 'Editor’s pick',
          imageUrl: doc?.imageUrl || doc?.thumbUrl,
          clickUrl: doc?.url || doc?.link,
          deeplinkUrl: doc?.deeplink,
          customNewsId: nid || undefined,
        };
      } else {
        payload = { headline: bannerDoc.message || 'More to read' };
      }
    }

    injections.push({
      afterId,
      banner: {
        id: String(bannerDoc._id),
        mode,
        payload,
        priority: Number(bannerDoc.priority ?? 100),
      },
    });
  };

  for (const b of banners) {
    const anchor = b.anchor || {};
    // resolve anchor kind with back-compat to legacy slot fields
    const kind =
      anchor.kind ||
      b.anchorKind ||
      (b.articleKey ? 'article' : (typeof (anchor.nth ?? b.startAfter) === 'number' ? 'slot' : (anchor.category || b.category ? 'category' : 'slot')));

    const articleKey = anchor.articleKey || b.articleKey;
    const anchorCat = (anchor.category || b.category || category || '').toString().toLowerCase();

    // slot parameters (supports legacy startAfter/repeatEvery)
    const nth = Number(anchor.nth ?? (b.startAfter ? Math.max(1, b.startAfter) : 10));
    const every = Number(b.repeatEvery || null) || null;

    if (kind === 'article' && articleKey && idxById.has(articleKey)) {
      pushInjection(articleKey, b);
      continue;
    }

    if (kind === 'category' && anchorCat && topIdxByCat.has(anchorCat)) {
      const topIdx = topIdxByCat.get(anchorCat);
      pushInjection(articles[topIdx].id, b);
      continue;
    }

    if (kind === 'slot') {
      // one or multiple injections: after nth, then every 'every' cards
      let pos = Math.max(1, nth) - 1; // convert to 0-based
      while (pos < articles.length) {
        pushInjection(articles[pos].id, b);
        if (!every) break;
        pos += Math.max(1, every);
      }
      continue;
    }
  }

  // de-conflict: keep highest priority per afterId
  const byAfterId = new Map();
  for (const inj of injections) {
    const prev = byAfterId.get(inj.afterId);
    if (!prev || inj.banner.priority > prev.banner.priority) {
      byAfterId.set(inj.afterId, inj);
    }
  }
  return Array.from(byAfterId.values());
}

/* -------------------- routes -------------------- */
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

    // Resolve injections against the full list (so the anchor is deterministic),
    // then filter to the current page (only inject where the afterId appears on this page).
    const allInjections = await resolveInjections(items, category);
    const sliceIds = new Set(slice.map(a => a.id));
    const pageInjections = allInjections.filter(inj => sliceIds.has(inj.afterId));

    res.json({
      items: slice,                 // ✅ unchanged for backwards-compat
      injections: pageInjections,   // ✅ new sidecar channel
      total: items.length,
      updatedAt: entry ? entry.updatedAt : 0,
      stale: STALE,
    });
  } catch (e) {
    console.error('[rss-agg] handler fail:', e);
    res.status(500).json({ error: 'rss-agg failed' });
  }
});

/* -------------------- warmup -------------------- */
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
