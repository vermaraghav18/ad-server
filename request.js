// request.js
const http = require('./httpClient');

async function get(url, opts = {}) {
  try {
    return await http.get(url, { validateStatus: () => true, ...opts });
  } catch (e) {
    try {
      // Helpful, human logs (not just Cloudflare IPs)
      const host = new URL(url).hostname;
      console.error('OUTBOUND ERROR', {
        url,
        hostname: host,
        code: e.code,
        message: e.message,
        timeout: (e.config && e.config.timeout),
      });
    } catch {}
    throw e;
  }
}

module.exports = { get };
