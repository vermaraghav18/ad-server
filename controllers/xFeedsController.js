// controllers/xFeedsController.js
const NodeCache = require('node-cache');
let pLimit = require('p-limit');
pLimit = typeof pLimit === 'function' ? pLimit : pLimit.default;
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
