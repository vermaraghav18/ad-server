const Parser = require('rss-parser');
const XFeedBanner = require('../models/xFeedBanner');

const parser = new Parser({
  timeout: 8000,
  headers: { 'User-Agent': 'knotshorts-xfeeds/1.0' },
});

// Simple in-memory cache: id -> { ts, items }
const cache = new Map();
const TTL_MS = (parseInt(process.env.XFEEDS_CACHE_TTL_SECONDS || '300', 10)) * 1000;

// Try to extract an image URL from common RSS fields
function pickImage(item = {}) {
  // enclosure.url
  if (item.enclosure && item.enclosure.url) return item.enclosure.url;

  // media:content
  if (item.media && item.media.content && item.media.content.url) {
    return item.media.content.url;
  }
  if (Array.isArray(item.mediaContent) && item.mediaContent[0]?.$?.url) {
    return item.mediaContent[0].$.url;
  }

  // content:encoded or contentSnippet (first <img>)
  const html = item['content:encoded'] || item.content || '';
  const m = /<img[^>]+src=["']([^"']+)["']/i.exec(html);
  if (m) return m[1];

  return ''; // fallback handled client-side
}

exports.list = async (req, res) => {
  const banners = await XFeedBanner.find().sort({ enabled: -1, order: 1, createdAt: 1 }).lean();
  res.json(banners);
};

exports.create = async (req, res) => {
  const { title = '', rssUrl, iconUrl = '', order = 0, enabled = true } = req.body || {};
  if (!rssUrl) return res.status(400).json({ error: 'rssUrl required' });

  const doc = await XFeedBanner.create({ title, rssUrl, iconUrl, order, enabled });
  res.status(201).json(doc);
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const patch = req.body || {};
  const updated = await XFeedBanner.findByIdAndUpdate(id, patch, { new: true }).lean();
  if (!updated) return res.status(404).json({ error: 'not found' });
  cache.delete(id); // invalidate cache on any changes
  res.json(updated);
};

exports.remove = async (req, res) => {
  const { id } = req.params;
  await XFeedBanner.findByIdAndDelete(id);
  cache.delete(id);
  res.json({ ok: true });
};

exports.items = async (req, res) => {
  const { id } = req.params;
  const limit = Math.max(1, Math.min(10, parseInt(req.query.limit || '5', 10)));

  const banner = await XFeedBanner.findById(id).lean();
  if (!banner || !banner.enabled) return res.status(404).json({ error: 'not found' });

  // cache
  const c = cache.get(id);
  const now = Date.now();
  if (c && (now - c.ts) < TTL_MS) {
    return res.json({ id, title: banner.title, iconUrl: banner.iconUrl, items: c.items.slice(0, limit) });
  }

  try {
    const feed = await parser.parseURL(banner.rssUrl);
    const items = (feed.items || []).slice(0, limit).map((it) => ({
      id: it.id || it.guid || it.link,
      title: it.title || '',
      link: it.link,
      pubDate: it.isoDate || it.pubDate || null,
      description: it.contentSnippet || it.content || '',
      imageUrl: pickImage(it),
      author: it.creator || it.author || '',
    }));

    cache.set(id, { ts: now, items });
    res.json({ id, title: banner.title, iconUrl: banner.iconUrl, items });
  } catch (err) {
    console.error('xfeeds parse failed', err.message);
    res.status(502).json({ error: 'failed_to_fetch_feed' });
  }
};
