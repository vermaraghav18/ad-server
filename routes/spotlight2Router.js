// routes/spotlight2Router.js
const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const { XMLParser } = require('fast-xml-parser');
const dayjs = require('dayjs');

const Spotlight2Section = require('../models/Spotlight2Section');
const Spotlight2Item = require('../models/Spotlight2Item');

const router = express.Router();

// ---------- Helpers ----------
function pick(obj, keys) {
  const out = {};
  keys.forEach(k => { if (obj[k] !== undefined) out[k] = obj[k]; });
  return out;
}
function toBool(v) { return v === true || v === 'true' || v === 1 || v === '1'; }
function parseIntOr(v, d) { const n = parseInt(v, 10); return Number.isFinite(n) ? n : d; }

// ---------- Sections CRUD ----------
router.get('/sections', async (req, res) => {
  try {
    const { q = '', enabled, page = 1, limit = 20, sortBy = 'sortIndex', sortDir = 'asc' } = req.query;
    const filter = {};
    if (q) filter.$or = [
      { name: new RegExp(q, 'i') },
      { key: new RegExp(q, 'i') },
      { description: new RegExp(q, 'i') },
    ];
    if (enabled !== undefined) filter.enabled = toBool(enabled);

    const sort = { [sortBy]: sortDir === 'desc' ? -1 : 1 };
    const skip = (parseIntOr(page, 1) - 1) * parseIntOr(limit, 20);

    const [items, total] = await Promise.all([
      Spotlight2Section.find(filter).sort(sort).skip(skip).limit(parseIntOr(limit, 20)),
      Spotlight2Section.countDocuments(filter),
    ]);

    res.json({ items, total, page: parseIntOr(page, 1), limit: parseIntOr(limit, 20) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/sections', async (req, res) => {
  try {
    const { name, key, description = '', enabled = true, sortIndex = 0 } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    if (!key) return res.status(400).json({ error: 'key is required' });

    const exists = await Spotlight2Section.findOne({ key });
    if (exists) return res.status(409).json({ error: 'key already exists' });

    const created = await Spotlight2Section.create({ name, key, description, enabled, sortIndex });
    res.status(201).json(created);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/sections/:id', async (req, res) => {
  try {
    const allowed = ['name', 'key', 'description', 'enabled', 'sortIndex'];
    const update = pick(req.body, allowed);
    const item = await Spotlight2Section.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!item) return res.status(404).json({ error: 'section not found' });
    res.json(item);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/sections/:id', async (req, res) => {
  try {
    const sec = await Spotlight2Section.findByIdAndDelete(req.params.id);
    if (!sec) return res.status(404).json({ error: 'section not found' });
    // Also remove its items
    await Spotlight2Item.deleteMany({ sectionId: sec._id });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ---------- Items CRUD ----------
router.get('/sections/:sectionId/items', async (req, res) => {
  try {
    const { q = '', enabled, page = 1, limit = 20, sortBy = 'sortIndex', sortDir = 'asc' } = req.query;
    const filter = { sectionId: req.params.sectionId };
    if (q) filter.$or = [
      { title: new RegExp(q, 'i') },
      { description: new RegExp(q, 'i') },
      { sourceName: new RegExp(q, 'i') },
    ];
    if (enabled !== undefined) filter.enabled = toBool(enabled);

    const sort = { [sortBy]: sortDir === 'desc' ? -1 : 1, createdAt: -1 };
    const skip = (parseIntOr(page, 1) - 1) * parseIntOr(limit, 20);

    const [items, total] = await Promise.all([
      Spotlight2Item.find(filter).sort(sort).skip(skip).limit(parseIntOr(limit, 20)),
      Spotlight2Item.countDocuments(filter),
    ]);

    res.json({ items, total, page: parseIntOr(page, 1), limit: parseIntOr(limit, 20) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/sections/:sectionId/items', async (req, res) => {
  try {
    const section = await Spotlight2Section.findById(req.params.sectionId);
    if (!section) return res.status(404).json({ error: 'section not found' });

    const { imageUrl = '', sourceName = '', title, description = '', linkUrl = '', publishedAt, enabled = true, sortIndex = 0, meta = {} } = req.body;
    if (!title) return res.status(400).json({ error: 'title is required' });

    const created = await Spotlight2Item.create({
      sectionId: section._id, imageUrl, sourceName, title, description, linkUrl,
      publishedAt: publishedAt ? new Date(publishedAt) : undefined,
      enabled, sortIndex, meta
    });
    res.status(201).json(created);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/items/:id', async (req, res) => {
  try {
    const allowed = ['imageUrl','sourceName','title','description','linkUrl','publishedAt','enabled','sortIndex','meta','sectionId'];
    const update = pick(req.body, allowed);
    if (update.publishedAt) update.publishedAt = new Date(update.publishedAt);
    const item = await Spotlight2Item.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!item) return res.status(404).json({ error: 'item not found' });
    res.json(item);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/items/:id', async (req, res) => {
  try {
    const item = await Spotlight2Item.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ error: 'item not found' });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ---------- Auto-extract from URL or XML ----------
router.post('/extract', async (req, res) => {
  try {
    const { url, xml } = req.body;

    // Case A: XML string provided
    if (xml && typeof xml === 'string') {
      const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });
      const data = parser.parse(xml);

      // Attempt common RSS/Atom shapes
      let item = null;
      if (data?.rss?.channel?.item) item = Array.isArray(data.rss.channel.item) ? data.rss.channel.item[0] : data.rss.channel.item;
      if (!item && data?.feed?.entry) item = Array.isArray(data.feed.entry) ? data.feed.entry[0] : data.feed.entry;

      const title = item?.title?.['#text'] || item?.title || '';
      const description = item?.description || item?.summary || '';
      const linkUrl = item?.link?.href || item?.link || item?.guid || '';
      const publishedAt = item?.pubDate || item?.published || item?.updated || null;
      const enclosureUrl = item?.enclosure?.url || '';

      return res.json({
        title,
        description,
        linkUrl,
        imageUrl: enclosureUrl,
        sourceName: '', // not always in XML—admin can set
        publishedAt: publishedAt ? new Date(publishedAt) : null,
        meta: { xmlParsed: true, raw: { link: item?.link, guid: item?.guid } }
      });
    }

    // Case B: Fetch HTML page and scrape OG tags
    if (url) {
      const resp = await axios.get(url, { timeout: 15000 });
      const html = resp.data;
      const $ = cheerio.load(html);

      const title = $('meta[property="og:title"]').attr('content')
        || $('meta[name="twitter:title"]').attr('content')
        || $('title').text() || '';
      const description = $('meta[property="og:description"]').attr('content')
        || $('meta[name="description"]').attr('content')
        || $('meta[name="twitter:description"]').attr('content')
        || '';
      const imageUrl = $('meta[property="og:image"]').attr('content')
        || $('meta[name="twitter:image"]').attr('content')
        || '';
      const sourceName = $('meta[property="og:site_name"]').attr('content') || '';
      const published = $('meta[property="article:published_time"]').attr('content')
        || $('meta[name="article:published_time"]').attr('content')
        || $('time[datetime]').attr('datetime')
        || '';

      return res.json({
        title,
        description,
        imageUrl,
        sourceName,
        linkUrl: url,
        publishedAt: published ? dayjs(published).toDate() : null,
        meta: { og: true }
      });
    }

    return res.status(400).json({ error: 'Provide url or xml' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------- Optional: simple plan (for Flutter later) ----------
router.get('/plan', async (req, res) => {
  try {
    const { sectionKey, sectionId, limit = 20 } = req.query;
    let section = null;
    if (sectionId) section = await Spotlight2Section.findById(sectionId);
    else if (sectionKey) section = await Spotlight2Section.findOne({ key: sectionKey });
    if (!section || !section.enabled) return res.json({ items: [], section });

    const items = await Spotlight2Item.find({ sectionId: section._id, enabled: true })
      .sort({ sortIndex: 1, createdAt: -1 })
      .limit(parseIntOr(limit, 20));

    res.json({ section, items });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
