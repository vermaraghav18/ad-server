// ad-server/controllers/tweetsController.js
const TweetItem = require('../models/tweetModel');

// ---------- helpers ----------
function between(str, start, end) {
  const s = str.indexOf(start);
  if (s === -1) return '';
  const e = str.indexOf(end, s + start.length);
  if (e === -1) return '';
  return str.slice(s + start.length, e);
}
function stripTags(s) { return String(s || '').replace(/<\/?[^>]+>/g, '').trim(); }
function stripCdata(s){ return (s || '').replace(/<!\[CDATA\[|\]\]>/g, '').trim(); }
function firstMatch(re, s){ const m = String(s||'').match(re); return m ? (m[1] ?? m[0]) : ''; }

// fix HTML entities in URLs
function unescapeHtml(s) {
  return String(s || '').replace(/&amp;/g, '&').replace(/&#38;/g, '&');
}

// fetch an article's og:image
async function getOgImage(url) {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'knotshorts-link-card' } });
    if (!r.ok) return '';
    const html = await r.text();
    return firstMatch(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i, html);
  } catch (_) { return ''; }
}

// follow t.co (and any) redirects and return final URL
async function resolveFinalUrl(url) {
  try {
    const r = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'knotshorts-resolver' } });
    return r.url || url;
  } catch (_) { return url; }
}

// Try oEmbed first (fast) then scrape tweet page; then follow t.co to article og:image
async function enrichTweetMeta(url) {
  const meta = { authorName:'', authorHandle:'', authorAvatar:'', text:'', media:[], createdAtTweet:null };

  // 1) oEmbed quick pass (gets text/author handle)
  try {
    const oe = await fetch(`https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}`);
    if (oe.ok) {
      const data = await oe.json();
      const html = String(data.html || '');

      const pHtml = firstMatch(/<p[^>]*>([\s\S]*?)<\/p>/i, html);
      meta.text = stripTags(pHtml || '').replace(/&amp;/g, '&');

      meta.authorHandle = firstMatch(/@([A-Za-z0-9_]{1,15})/, html);
      meta.authorName = stripTags(firstMatch(/<strong[^>]*>([^<]+)<\/strong>/i, html) || '');
    }
  } catch (_) {}

  // 2) Tweet page scrape (author, pbs images, og:image on tweet)
  let scrapedHtml = '';
  try {
    if (!meta.text || meta.media.length === 0 || !meta.authorHandle || !meta.authorName) {
      const r = await fetch(url, { headers: { 'User-Agent': 'knotshorts-x-scraper' } });
      if (r.ok) {
        const html = await r.text();
        scrapedHtml = html;

        // author
        meta.authorName ||= firstMatch(/"name":"([^"]+)","screen_name":/i, html) ||
                            stripTags(firstMatch(/<meta property="og:title" content="([^"]+)"/i, html));
        meta.authorHandle ||= firstMatch(/"screen_name":"([A-Za-z0-9_]{1,15})"/i, html) ||
                              firstMatch(/@([A-Za-z0-9_]{1,15})/, html);
        meta.authorAvatar ||= unescapeHtml(firstMatch(/"profile_image_url_https":"([^"]+)"/i, html).replace(/\\u0026/g, '&'));

        // text
        if (!meta.text) {
          const pHtml = firstMatch(/<p[^>]*>([\s\S]*?)<\/p>/i, html);
          meta.text = stripTags((pHtml || '').replace(/\\n/g, ' ')).replace(/&amp;/g, '&') ||
                      stripTags(firstMatch(/<meta property="og:description" content="([^"]+)"/i, html));
        }

        // media #1: native pbs uploads
        const pbs = Array.from(html.matchAll(/https?:\/\/pbs\.twimg\.com\/media\/[A-Za-z0-9_\-\.%?=&]+/g))
          .map(m => unescapeHtml(m[0]));

        // media #2: tweet-page og:image
        const ogOnTweet = unescapeHtml(firstMatch(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i, html));

        const mediaSet = new Set([...pbs, ...(ogOnTweet ? [ogOnTweet] : [])].filter(Boolean));
        if (mediaSet.size) meta.media = Array.from(mediaSet).slice(0, 4);

        // created at
        const ts = firstMatch(/"created_at":"([^"]+)"/i, html);
        if (ts) meta.createdAtTweet = new Date(ts);
      }
    }
  } catch (_) {}

  // 3) Final fallback for link-cards: follow t.co and grab article og:image
  try {
    if (!meta.media || meta.media.length === 0) {
      // search in scrapedHtml first; if unavailable, try text
      const source = scrapedHtml || meta.text || '';
      let tco = firstMatch(/https?:\/\/t\.co\/[A-Za-z0-9]+/i, source);

      // If no t.co, grab first non-twitter URL from any href in the tweet HTML
      if (!tco) {
        const href = firstMatch(/<a[^>]+href=["']([^"']+)["']/i, source);
        if (href && !/twitter\.com|x\.com/i.test(href)) {
          tco = href;
        }
      }

      if (tco) {
        const finalUrl = await resolveFinalUrl(unescapeHtml(tco));
        const ogImg = await getOgImage(finalUrl);
        if (ogImg) meta.media = [unescapeHtml(ogImg)];
      }
    }
  } catch (_) {}

  // cleanup
  meta.authorAvatar = unescapeHtml(meta.authorAvatar);
  meta.media = (meta.media || []).map(unescapeHtml);

  return meta;
}

// ---------- CRUD ----------
exports.list = async (req, res) => {
  try {
    const { section, enabled } = req.query;
    const q = {};
    if (section) q.sections = section;
    if (enabled !== undefined) q.enabled = enabled === 'true';
    const items = await TweetItem.find(q).sort({ sortIndex: 1, createdAt: -1 });
    res.json(items);
  } catch (e) {
    console.error('Tweets list error:', e);
    res.status(500).json({ error: 'Failed to fetch tweets' });
  }
};

exports.create = async (req, res) => {
  try {
    let {
      url, sections = [], enabled = true, sortIndex = 0,
      showInNews = true, injectEveryNCards = 5,
      authorName = '', authorHandle = '', authorAvatar = '',
      text = '', media = [], createdAtTweet = null,
    } = req.body;

    if (!url) return res.status(400).json({ error: 'url is required' });

    // If minimal data, try to enrich
    if (!authorName || !text || media.length === 0) {
      const meta = await enrichTweetMeta(url);
      authorName ||= meta.authorName;
      authorHandle ||= meta.authorHandle;
      authorAvatar ||= meta.authorAvatar;
      text ||= meta.text;
      media = media.length ? media : meta.media;
      createdAtTweet ||= meta.createdAtTweet;
    }

    // ensure URLs are clean
    authorAvatar = unescapeHtml(authorAvatar);
    media = (media || []).map(unescapeHtml);

    const doc = await TweetItem.create({
      url, sections, enabled, sortIndex, showInNews, injectEveryNCards,
      authorName, authorHandle, authorAvatar, text, media, createdAtTweet,
    });
    res.status(201).json(doc);
  } catch (e) {
    console.error('Tweets create error:', e);
    res.status(500).json({ error: 'Failed to create tweet item' });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = { ...req.body };
    if (payload.authorAvatar) payload.authorAvatar = unescapeHtml(payload.authorAvatar);
    if (Array.isArray(payload.media)) payload.media = payload.media.map(unescapeHtml);
    const updated = await TweetItem.findByIdAndUpdate(id, payload, { new: true });
    if (!updated) return res.status(404).json({ error: 'Tweet item not found' });
    res.json(updated);
  } catch (e) {
    console.error('Tweets update error:', e);
    res.status(500).json({ error: 'Failed to update tweet item' });
  }
};

exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await TweetItem.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ error: 'Tweet item not found' });
    res.json({ ok: true });
  } catch (e) {
    console.error('Tweets delete error:', e);
    res.status(500).json({ error: 'Failed to delete tweet item' });
  }
};

// ---------- Import from RSS ----------
exports.importFromRssSimple = async (req, res) => {
  try {
    const {
      rssUrl,
      sections = [],
      enabled = true,
      sortIndex = 0,
      showInNews = true,
      injectEveryNCards = 5,
      maxItems = 50,
    } = req.body || {};
    if (!rssUrl) return res.status(400).json({ error: 'rssUrl is required' });

    const r = await fetch(rssUrl, { headers: { 'User-Agent': 'knotshorts-x-importer' } });
    if (!r.ok) return res.status(400).json({ error: `RSS HTTP ${r.status}` });
    const xml = await r.text();

    const items = [];
    let from = 0;
    while (true) {
      const s = xml.indexOf('<item>', from);
      if (s === -1) break;
      const e = xml.indexOf('</item>', s);
      if (e === -1) break;
      items.push(xml.slice(s, e + 7));
      from = e + 7;
      if (items.length >= maxItems) break;
    }

    let created = 0;
    for (const raw of items) {
      const link = stripCdata(between(raw, '<link>', '</link>'));
      if (!link) continue;

      const title = stripCdata(between(raw, '<title>', '</title>'));
      const desc = stripCdata(between(raw, '<description>', '</description>'));
      const text = stripTags(title || desc);

      const rawMedia =
        firstMatch(/<media:content[^>]+url=["']([^"']+)["']/i, raw) ||
        firstMatch(/<img[^>]+src=["']([^"']+)["']/i, desc);
      const mediaUrl = unescapeHtml(rawMedia);

      const exists = await TweetItem.findOne({ url: link });
      if (exists) continue;

      const meta = await enrichTweetMeta(link);

      await TweetItem.create({
        url: link,
        sections,
        enabled,
        sortIndex,
        showInNews,
        injectEveryNCards,
        authorName: meta.authorName,
        authorHandle: meta.authorHandle,
        authorAvatar: unescapeHtml(meta.authorAvatar),
        text: meta.text || text,
        media: (meta.media && meta.media.length ? meta.media : (mediaUrl ? [mediaUrl] : [])).map(unescapeHtml),
        createdAtTweet: meta.createdAtTweet || null,
      });
      created++;
    }

    res.json({ ok: true, count: created });
  } catch (e) {
    console.error('Tweets import-simple error:', e);
    res.status(500).json({ error: 'Failed to import tweets from RSS' });
  }
};
