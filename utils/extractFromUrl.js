const axios = require('axios');
const cheerio = require('cheerio');
const { XMLParser } = require('fast-xml-parser');

const normalize = (s) => (typeof s === 'string' ? s.trim() : '');
const first = (x) => (Array.isArray(x) ? x[0] : x);

async function fetchBuffer(url) {
  const resp = await axios.get(url, {
    responseType: 'arraybuffer',
    maxRedirects: 5,
    timeout: 15000,
    headers: { 'User-Agent': 'KnotShorts/1.0 (+metadata-extractor)' },
    validateStatus: (s) => s >= 200 && s < 400,
  });
  return { data: resp.data, contentType: resp.headers['content-type'] || '' };
}

function extractFromHTML(html, url) {
  const $ = cheerio.load(html);

  const pick = (...sels) => {
    for (const s of sels) {
      const v = $(s).attr('content') || $(s).attr('src') || $(s).text();
      if (v && normalize(v)) return normalize(v);
    }
    return '';
  };

  const title = pick(
    'meta[property="og:title"]',
    'meta[name="twitter:title"]',
    'title'
  );
  const description = pick(
    'meta[property="og:description"]',
    'meta[name="description"]',
    'meta[name="twitter:description"]'
  );
  const imageUrl = pick(
    'meta[property="og:image"]',
    'meta[name="twitter:image"]'
  );
  const source = (() => {
    try { return new URL(url).host.replace(/^www\./, ''); } catch { return ''; }
  })();

  return {
    title,
    description,
    imageUrl,
    link: url,
    source,
  };
}

function extractFromXML(xml, url) {
  const parser = new XMLParser({ ignoreAttributes: false });
  const j = parser.parse(xml);

  // Try RSS -> channel.item, Atom -> feed.entry
  const items =
    j?.rss?.channel?.item ||
    j?.feed?.entry ||
    j?.RDF?.item ||
    [];

  const it = first(items) || {};
  const title = normalize(it.title?.['#text'] || it.title);
  const description = normalize(
    it.description?.['#text'] || it.summary?.['#text'] || it.description || it.summary
  );
  const link = normalize(
    (typeof it.link === 'string' && it.link) ||
    it.link?.href ||
    it.link?.['@_href'] ||
    ''
  );
  const enclosureImg =
    it.enclosure?.['@_type']?.startsWith?.('image') ? it.enclosure?.['@_url'] : '';
  const mediaContent = it['media:content']?.['@_url'] || '';
  const imageUrl = normalize(enclosureImg || mediaContent);
  const source = (() => {
    try { return new URL(url).host.replace(/^www\./, ''); } catch { return ''; }
  })();

  return {
    title,
    description,
    imageUrl,
    link: link || url, // fallback to the feed URL
    source,
  };
}

async function extractFromUrl(url) {
  const { data, contentType } = await fetchBuffer(url);
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
  const text = buf.toString('utf8');

  if (/xml|rss|atom/.test(contentType) || url.endsWith('.xml')) {
    return extractFromXML(text, url);
  }
  return extractFromHTML(text, url);
}

module.exports = { extractFromUrl };
