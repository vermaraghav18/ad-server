// httpClient.js
const https = require('https');
const axios = require('axios');

// Keep connections open; many small requests perform better this way.
const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 50,
  timeout: 20_000, // socket idle timeout (ms)
});

const http = axios.create({
  timeout: 12_000, // request timeout (ms)
  httpsAgent,
  // Pretend to be a normal browser; helps with Cloudflare/WAF’d sites
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121 Safari/537.36',
    'Accept': 'text/html,application/xml,application/json;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
  },
});

// Light retry on transient network errors
const RETRYABLE = new Set(['ETIMEDOUT', 'ECONNRESET', 'EHOSTUNREACH', 'ENETUNREACH']);
http.interceptors.response.use(
  r => r,
  async err => {
    const code = err.code || '';
    const cfg = err.config || {};
    cfg.__retryCount = (cfg.__retryCount || 0) + 1;
    if (cfg.__retryCount <= 2 && RETRYABLE.has(code)) {
      await new Promise(r => setTimeout(r, 300 * cfg.__retryCount)); // simple backoff
      return http(cfg);
    }
    return Promise.reject(err);
  }
);

module.exports = http;
