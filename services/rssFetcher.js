// services/rssFetcher.js
const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');
const dayjs = require('dayjs');

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  processEntities: true
});

async function fetchFeed(url) {
  const res = await axios.get(url, { timeout: 15000, responseType: 'text' });
  const xml = res.data;
  const json = parser.parse(xml);
  const items = json?.rss?.channel?.item || json?.feed?.entry || [];
  return Array.isArray(items) ? items : [items];
}

function mapRssItem(feedId, it) {
  // normalize common fields
  const link = it.link?.href || it.link || '';
  const pub = it.pubDate || it.updated || it.published || null;
  const contentHtml = it['content:encoded'] || it.content || it.description || '';
  const media = it['media:content']?.url || it.enclosure?.url || null;
  const author =
    it['dc:creator'] || it.author?.name || it.author || it.creator || '';

  return {
    sourceId: feedId,
    link,
    contentHtml,
    description: it.description,
    title: it.title,
    pubDate: pub ? new Date(pub) : new Date(),
    thumbUrl: media || null,
    authorName: String(author || '').trim(),
  };
}

function timeId() { return Math.random().toString(36).slice(2) }

async function fetchMapped(feed) {
  const entries = await fetchFeed(feed.url);
  return entries.map(e => ({
    ...mapRssItem(feed._id?.toString() || feed.url, e),
    _internalId: timeId(),
  }));
}

module.exports = {
  fetchMapped
};
