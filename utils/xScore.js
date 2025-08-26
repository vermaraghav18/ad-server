// utils/xScore.js
function scoreXItem(item) {
  let s = 0;
  if (item.externalUrl && !/(^|\.)x\.com$/i.test(item.displayDomain)) s += 3;
  if (item.thumbUrl) s += 2;
  if ((item.words || 0) >= 12) s += 1;
  if (item.isRetweet) s -= 3;
  if ((item.hashtagCount || 0) > 2) s -= 2;
  if (item.isLinkOnly) s -= 2;
  if (/utm_|ref=|[?&]s=\d+/.test(item.externalUrl || '')) s -= 1;
  return s;
}
module.exports = { scoreXItem };
