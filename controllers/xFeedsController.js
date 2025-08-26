// controllers/xFeedsController.js
// Minimal, robust controller for X Feeds v2.
// - No p-limit dependency
// - Works even if model file name casing differs (xFeed.js vs XFeed.js)

const axios = require('axios');

function safeRequire(candidates) {
  for (const p of candidates) {
    try {
      return require(p);
    } catch (_) {}
  }
  return null;
}

// Try both common casings so we don't 500 on case mismatch
const XFeed =
  safeRequire(['../models/xFeed', '../models/XFeed']) ||
  (() => {
    // Fallback in-memory store if model is missing (keeps server booting).
    console.warn(
      '[xFeedsController] WARNING: ../models/xFeed(.js) not found. Using in-memory store (non-persistent).'
    );
    const _mem = [];
    return {
      find: async (q = {}) => {
        if (!Object.keys(q).length) return _mem;
        return _mem.filter((d) => {
          for (const [k, v] of Object.entries(q)) {
            if (d[k] !== v) return false;
          }
          return true;
        });
      },
      findByIdAndUpdate: async (id, updates, opts = {}) => {
        const i = _mem.findIndex((d) => String(d._id) === String(id));
        if (i === -1) return null;
        _mem[i] = { ..._mem[i], ...updates };
        return opts.new ? _mem[i] : null;
      },
      findByIdAndDelete: async (id) => {
        const i = _mem.findIndex((d) => String(d._id) === String(id));
        if (i !== -1) _mem.splice(i, 1);
      },
      create: async (doc) => {
        const _id = String(Date.now()) + Math.random().toString(36).slice(2);
        const row = { _id, enabled: true, priority: 100, injectEveryNCards: 5, ...doc };
        _mem.push(row);
        return row;
      },
    };
  })();

/**
 * GET /api/xfeeds
 * - Default: return enabled feeds only (app consumption)
 * - Admin: pass ?all=1 to get all feeds
 */
exports.list = async (req, res) => {
  try {
    const all = req.query.all === '1' || req.query.all === 'true';
    const q = all ? {} : { enabled: true };
    const rows = await XFeed.find(q);
    res.json(rows);
  } catch (e) {
    console.error('[xfeeds.list] error:', e);
    res.status(500).json({ error: 'Failed to list xfeeds' });
  }
};

/**
 * POST /api/xfeeds
 * Body: { title, handle, url, iconUrl, enabled, injectEveryNCards, priority }
 */
exports.create = async (req, res) => {
  try {
    const {
      title = '',
      handle = '',
      url = '',
      iconUrl = '',
      enabled = true,
      injectEveryNCards = 5,
      priority = 100,
    } = req.body;

    if (!title && !handle && !url) {
      return res
        .status(400)
        .json({ error: 'Provide at least one of: title, handle, url' });
    }

    const row = await XFeed.create({
      title,
      handle,
      url,
      iconUrl,
      enabled: !!enabled,
      injectEveryNCards: Number(injectEveryNCards) || 5,
      priority: Number(priority) || 100,
    });

    res.status(201).json(row);
  } catch (e) {
    console.error('[xfeeds.create] error:', e);
    res.status(400).json({ error: e.message || 'Create failed' });
  }
};

/**
 * PUT /api/xfeeds/:id
 */
exports.update = async (req, res) => {
  try {
    const updated = await XFeed.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.json(updated);
  } catch (e) {
    console.error('[xfeeds.update] error:', e);
    res.status(400).json({ error: e.message || 'Update failed' });
  }
};

/**
 * DELETE /api/xfeeds/:id
 */
exports.remove = async (req, res) => {
  try {
    await XFeed.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    console.error('[xfeeds.remove] error:', e);
    res.status(400).json({ error: e.message || 'Delete failed' });
  }
};

/**
 * GET /api/xfeeds/items
 * Optional: provide ?url=... or ?handle=...  (placeholder implementation)
 * Currently returns [] to keep API contract without external calls.
 */
exports.items = async (req, res) => {
  try {
    // You can expand this later to fetch from your source.
    res.json([]);
  } catch (e) {
    console.error('[xfeeds.items] error:', e);
    res.status(500).json({ error: 'Failed to fetch feed items' });
  }
};
