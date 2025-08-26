// controllers/xFeedsController.js
const NodeCache = require('node-cache');
const pLimit = require('p-limit');
const dayjs = require('dayjs');

const XFeed = require('../models/XFeed');
const { fetchMapped } = require('../services/rssFetcher');
const { cleanItem, isEmojiOrLinkOnly } = require('../utils/xTextCleanser');
const { scoreXItem } = require('../utils/xScore');

const FEED_CACHE = new NodeCache({ stdTTL: 60 * 5 }); // 5 minutes
const limit = pLimit(4);

// GET /api/xfeeds
async function listFeeds(req, res) {
  const feeds = await XFeed.find({ enabled: true }).sort({ order: 1, name: 1 }).lean();
  res.json(feeds.map(f => ({
    id: String(f._id), name: f.name, url: f.url, enabled: f.enabled, lang: f.lang
  })));
}

// GET /api/xfeeds/items?limit=50&page=1&langs=en&dropPureRT=1&maxHashtags=2
async function listItems(req, res) {
  const pageSize = Math.min(parseInt(req.query.limit || '50', 10), 100);
  const page = Math.max(parseInt(req.query.page || '1', 10), 1);

  const maxHashtags = parseInt(req.query.maxHashtags || '2', 10);
  const dropPureRT = String(req.query.dropPureRT || '1') === '1';
  const allowedLangs = String(req.query.langs || 'en').split(',').filter(Boolean);

  const enabledFeeds = await XFeed.find({ enabled: true }).sort({ order: 1 }).lean();

  const batches = await Promise.all(
    enabledFeeds.map(feed =>
      limit(async () => {
        const cacheKey = `x:${feed.url}`;
        const cached = FEED_CACHE.get(cacheKey);
        if (cached) return cached;
        const mapped = await fetchMapped(feed);
        FEED_CACHE.set(cacheKey, mapped);
        return mapped;
      })
    )
  );

  const merged = batches.flat();

  // Clean, filter, score
  const seenText = new Set();
  const seenUrl = new Set();

  const cleaned = merged.map(m => {
    const c = cleanItem({ contentHtml: m.contentHtml, description: m.description, title: m.title, link: m.link });
    const item = {
      id: m._internalId,
      sourceId: m.sourceId,
      authorName: m.authorName || '',
      authorHandle: '', // can be parsed if your RSS includes it; keep blank otherwise
      textRaw: m.title || '',
      textClean: c.textClean,
      url: c.externalUrl || m.link,
      displayDomain: c.displayDomain,
      thumbUrl: m.thumbUrl,
      isQuote: false,          // could be inferred from HTML if needed
      quoteText: null,
      isRetweet: c.isRetweet,
      lang: 'en',              // simple default; plug a language detector if you like
      createdAt: m.pubDate,
      hashtagCount: c.hashtagCount,
      words: c.words,
      isLinkOnly: isEmojiOrLinkOnly(c.textClean),
    };
    item.score = scoreXItem(item);
    item._normTextKey = item.textClean.toLowerCase().replace(/\s+/g, ' ').slice(0, 280);
    item._normUrlKey = (item.url || '').split('?')[0];
    return item;
  })
  .filter(it => {
    if (dropPureRT && it.isRetweet) return false;
    if (it.hashtagCount > maxHashtags) return false;
    if (it.isLinkOnly) return false;
    if (allowedLangs.length && !allowedLangs.includes(it.lang)) return false;

    // de-dup
    if (it._normUrlKey && seenUrl.has(it._normUrlKey)) return false;
    if (it._normTextKey && seenText.has(it._normTextKey)) return false;
    if (it._normUrlKey) seenUrl.add(it._normUrlKey);
    if (it._normTextKey) seenText.add(it._normTextKey);
    return true;
  })
  .sort((a, b) => {
    const t = new Date(b.createdAt) - new Date(a.createdAt);
    if (t !== 0) return t;
    return (b.score || 0) - (a.score || 0);
  });

  const start = (page - 1) * pageSize;
  const pageItems = cleaned.slice(start, start + pageSize);

  res.json({
    page,
    pageSize,
    total: cleaned.length,
    items: pageItems.map(({ _normTextKey, _normUrlKey, hashtagCount, words, ...rest }) => rest),
  });
}

module.exports = {
  listFeeds,
  listItems,
};
