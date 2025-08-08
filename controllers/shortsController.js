// ad-server/controllers/shortsController.js
const ShortItem = require('../models/shortsModel');

// --- helpers ---
function detectPlatform(url) {
  try {
    const u = new URL(url);
    const h = u.hostname.toLowerCase();
    if (h.includes('youtube.com') || h.includes('youtu.be')) return 'youtube';
    if (h.includes('instagram.com')) return 'instagram';
    if (h.includes('x.com') || h.includes('twitter.com')) return 'x';
    return 'other';
  } catch {
    return 'other';
  }
}

function extractYouTubeId(url) {
  try {
    // Supports: https://youtube.com/shorts/ID , https://youtu.be/ID , watch?v=ID
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) {
      return u.pathname.replace('/', '');
    }
    if (u.pathname.startsWith('/shorts/')) {
      return u.pathname.split('/shorts/')[1].split('/')[0];
    }
    if (u.searchParams.get('v')) {
      return u.searchParams.get('v');
    }
    return '';
  } catch {
    return '';
  }
}

function defaultThumbFor(url, platform) {
  if (platform === 'youtube') {
    const id = extractYouTubeId(url);
    if (id) return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
  }
  return '';
}

// --- CRUD handlers ---
exports.list = async (req, res) => {
  try {
    const { section, enabled } = req.query;

    const query = {};
    if (section) query.sections = section; // match any doc containing this section
    if (enabled !== undefined) query.enabled = enabled === 'true';

    const items = await ShortItem.find(query).sort({ sortIndex: 1, createdAt: -1 });

    res.json(items);
  } catch (err) {
    console.error('Shorts list error:', err);
    res.status(500).json({ error: 'Failed to fetch shorts' });
  }
};

exports.create = async (req, res) => {
  try {
    let {
      url,
      sourceName,
      sections = [],
      enabled = true,
      sortIndex = 0,
      showInNews = false,
      showInMovies = false,
      injectEveryNCards = 5,
      thumbnailUrl = '',
      platform, // optional override
    } = req.body;

    if (!url || !sourceName) {
      return res.status(400).json({ error: 'Missing required fields: url, sourceName' });
    }

    platform = platform || detectPlatform(url);
    if (!thumbnailUrl) thumbnailUrl = defaultThumbFor(url, platform);

    const doc = await ShortItem.create({
      url,
      sourceName,
      sections,
      enabled,
      sortIndex,
      showInNews,
      showInMovies,
      injectEveryNCards,
      thumbnailUrl,
      platform,
    });

    res.status(201).json(doc);
  } catch (err) {
    console.error('Shorts create error:', err);
    res.status(500).json({ error: 'Failed to create short item' });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = { ...req.body };

    // Recalculate platform/thumbnail if URL changed or fields missing
    if (payload.url) {
      const p = detectPlatform(payload.url);
      payload.platform = payload.platform || p;
      if (!payload.thumbnailUrl) {
        payload.thumbnailUrl = defaultThumbFor(payload.url, payload.platform);
      }
    }

    const updated = await ShortItem.findByIdAndUpdate(id, payload, { new: true });
    if (!updated) return res.status(404).json({ error: 'Short item not found' });

    res.json(updated);
  } catch (err) {
    console.error('Shorts update error:', err);
    res.status(500).json({ error: 'Failed to update short item' });
  }
};

exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await ShortItem.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ error: 'Short item not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('Shorts delete error:', err);
    res.status(500).json({ error: 'Failed to delete short item' });
  }
};

// =====================
// Render-safe RSS import
// (no external npm deps)
// =====================

// Node 18+ has global fetch. If not, this will throw and you’ll see it in logs.
async function getText(url) {
  const r = await fetch(url, { headers: { 'User-Agent': 'knotshorts-importer' } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return await r.text();
}

function between(str, start, end) {
  const s = str.indexOf(start);
  if (s === -1) return '';
  const e = str.indexOf(end, s + start.length);
  if (e === -1) return '';
  return str.slice(s + start.length, e);
}

function stripCdata(s) {
  return (s || '').replace(/<!\[CDATA\[|\]\]>/g, '').trim();
}

function extractImgFromHtml(html) {
  const m = String(html || '').match(/<img[^>]+src=["']([^"']+)["']/i);
  return m ? m[1] : '';
}

function extractYouTubeUrl(htmlOrXml) {
  const m = String(htmlOrXml || '').match(
    /https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)[A-Za-z0-9_\-]{6,}/i
  );
  return m ? m[0] : '';
}

// POST /api/shorts/import-simple
exports.importFromRssSimple = async (req, res) => {
  try {
    const {
      rssUrl,
      sourceName = 'RSS',
      sections = [],
      showInNews = true,
      showInMovies = false,
      enabled = true,
      injectEveryNCards = 5,
      maxItems = 50,
    } = req.body || {};

    if (!rssUrl) return res.status(400).json({ error: 'rssUrl is required' });

    const xml = await getText(rssUrl);

    // split by <item> ... </item>
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
      // Prefer a YouTube link if present in description; otherwise <link>
      const link =
        extractYouTubeUrl(raw) ||
        stripCdata(between(raw, '<link>', '</link>'));

      if (!link) continue;

      const desc = stripCdata(between(raw, '<description>', '</description>'));
      const mediaTagUrlMatch = raw.match(/<media:content[^>]+url=["']([^"']+)["']/i);
      const mediaUrl = mediaTagUrlMatch ? mediaTagUrlMatch[1] : '';
      const thumb = mediaUrl || extractImgFromHtml(desc);

      const platform = detectPlatform(link);
      const thumbnailUrl = defaultThumbFor(link, platform) || thumb || '';

      // skip duplicates by URL
      const exists = await ShortItem.findOne({ url: link });
      if (exists) continue;

      await ShortItem.create({
        url: link,
        sourceName,
        sections,
        enabled,
        sortIndex: 0,
        showInNews,
        showInMovies,
        injectEveryNCards,
        thumbnailUrl,
        platform,
      });
      created++;
    }

    return res.json({ ok: true, count: created });
  } catch (err) {
    console.error('Shorts import-simple error:', err);
    return res.status(500).json({ error: 'Failed to import from RSS' });
  }
};
