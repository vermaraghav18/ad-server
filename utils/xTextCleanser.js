// utils/xTextCleanser.js
const he = require('he');

const EMOJI_RE = /\p{Extended_Pictographic}/gu;
const RT_PREFIX_RE = /^RT\s+@\w+:\s*/;
const HASHTAG_RE = /#[\p{L}\p{N}_]+/gu;
const MENTION_RE = /@[\w_]{2,}/g;
const URL_RE = /(https?:\/\/[^\s)\]]+)/gi;
const THREAD_COUNTER_RE = /\b\d+\/\d+\b/g;

// strip HTML tags quickly (we only need plain text)
function stripTags(html) {
  return he
    .decode(String(html || '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<blockquote[^>]*>[\s\S]*?<\/blockquote>/gi, (m) => {
        // keep the quoted text separately
        const inner = m.replace(/<\/?blockquote[^>]*>/gi, '');
        return `\n“${inner.replace(/<[^>]+>/g, '')}”\n`;
      })
      .replace(/<[^>]+>/g, '')
    )
    .replace(/\u00A0/g, ' ');
}

function sentenceCase(s) {
  if (!s) return s;
  const lower = s.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function deTrack(url) {
  try {
    const u = new URL(url);
    ['utm_source','utm_medium','utm_campaign','utm_term','utm_content','ref','s'].forEach(k => u.searchParams.delete(k));
    return u.toString();
  } catch { return url; }
}

function domainFrom(url) {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '');
  } catch { return 'x.com'; }
}

function normalizeSpaces(s) {
  return s.replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();
}

function stripHashtagSymbols(s) {
  // keep the word, drop '#'
  return s.replace(HASHTAG_RE, (m) => m.slice(1));
}

function isMostlyUpperAlpha(s) {
  const letters = (s.match(/[A-Z]/g) || []).length;
  const total   = (s.match(/[A-Za-z]/g) || []).length;
  if (total < 10) return false;
  return letters / total > 0.8;
}

function extractFirstExternalUrl(textOrHtml) {
  const urls = (textOrHtml.match(URL_RE) || []).map(deTrack);
  // Prefer non-X links
  for (const u of urls) {
    const d = domainFrom(u);
    if (!/^(x|twitter|t\.co)/i.test(d)) return u;
  }
  return urls[0] || null;
}

function countHashtags(s) {
  return (s.match(HASHTAG_RE) || []).length;
}

function cleanItem(raw) {
  // raw: { textHtml, title, description, contentHtml }
  const html = raw.contentHtml || raw.description || raw.title || '';
  const text0 = stripTags(html);
  const text1 = text0.replace(RT_PREFIX_RE, ''); // remove RT prefix
  const text2 = text1.replace(THREAD_COUNTER_RE, '');
  const text3 = text2.replace(EMOJI_RE, '');     // strip emojis
  const text4 = stripHashtagSymbols(text3);
  const text  = normalizeSpaces(text4);

  const isRetweet = RT_PREFIX_RE.test(text0);
  const upperFix  = isMostlyUpperAlpha(text) ? sentenceCase(text) : text;

  const externalUrl = extractFirstExternalUrl(html) || raw.link || null;
  const displayDomain = externalUrl ? domainFrom(externalUrl) : 'x.com';

  const hashtagCount = countHashtags(text0);
  const words = (upperFix.match(/[A-Za-zÀ-ÖØ-öø-ÿ]+/g) || []).length;
  const alphaChars = (upperFix.match(/[A-Za-zÀ-ÖØ-öø-ÿ]/g) || []).length;

  return {
    textClean: upperFix,
    isRetweet,
    externalUrl,
    displayDomain,
    hashtagCount,
    words,
    alphaChars
  };
}

function isEmojiOrLinkOnly(s) {
  const withoutUrls = s.replace(URL_RE, '').trim();
  const alpha = (withoutUrls.match(/[A-Za-zÀ-ÖØ-öø-ÿ]/g) || []).length;
  const words = (withoutUrls.match(/[A-Za-zÀ-ÖØ-öø-ÿ]+/g) || []).length;
  return alpha < 8 || words <= 2;
}

module.exports = {
  cleanItem,
  deTrack,
  domainFrom,
  isEmojiOrLinkOnly,
};
