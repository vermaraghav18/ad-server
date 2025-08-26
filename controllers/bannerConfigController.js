// controllers/bannerConfigController.js
const BannerConfig = require('../models/BannerConfig');

// ---------- helpers ----------
function pick(v) {
  return v === undefined || v === null || v === '' ? undefined : v;
}

function buildAnchor(body = {}) {
  const kind = (body.anchor?.kind || body.anchorKind || body.kind || 'slot').toString();
  const articleKey = pick(body.anchor?.articleKey || body.articleKey);
  let category = pick((body.anchor?.category || body.category || '').toString().toLowerCase());
  const nth = Number(body.anchor?.nth ?? body.nth ?? body.startAfter ?? 10);
  return { kind, articleKey, category, nth: Number.isFinite(nth) ? Math.max(1, nth) : 10 };
}

function buildPayload(body = {}) {
  // accept topic from payload.topic or top-level topic
  const rawTopic = body.payload?.topic ?? body.topic;
  const topic = pick((rawTopic ?? '').toString().trim().toLowerCase());

  return {
    headline:     pick(body.payload?.headline    ?? body.headline),
    imageUrl:     pick(body.payload?.imageUrl    ?? body.imageUrl),
    clickUrl:     pick(body.payload?.clickUrl    ?? body.clickUrl ?? body.targetUrl),
    deeplinkUrl:  pick(body.payload?.deeplinkUrl ?? body.deeplinkUrl),
    customNewsId: pick(body.payload?.customNewsId ?? body.customNewsId),
    topic, // ✅ NEW
  };
}

// ---------- list ----------
exports.list = async (req, res) => {
  const q = {};
  if (req.query.mode) q.mode = req.query.mode;
  if (req.query.activeOnly === '1') q.isActive = true;
  const docs = await BannerConfig.find(q).sort({ priority: -1, createdAt: -1 });
  res.json(docs);
};

// ---------- get one ----------
exports.get = async (req, res) => {
  const doc = await BannerConfig.findById(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Not found' });
  res.json(doc);
};

// ---------- create ----------
exports.create = async (req, res) => {
  try {
    const {
      mode,
      startAfter,
      repeatEvery,
      priority,
      isActive,
      activeFrom,
      activeTo,
      message,
    } = req.body;

    const anchor  = buildAnchor(req.body);
    const payload = buildPayload(req.body);

    const doc = await BannerConfig.create({
      mode,
      anchor,
      payload,
      startAfter: startAfter !== undefined ? Number(startAfter) : undefined,
      repeatEvery: repeatEvery ? Number(repeatEvery) : undefined,
      priority: priority !== undefined ? Number(priority) : undefined,
      isActive: isActive === undefined ? true : !!JSON.parse(String(isActive)),
      activeFrom: activeFrom ? new Date(activeFrom) : undefined,
      activeTo: activeTo ? new Date(activeTo) : undefined,
      // legacy mirrors (kept in sync for older clients)
      imageUrl: payload.imageUrl,
      customNewsId: payload.customNewsId,
      message: pick(message),
    });

    res.status(201).json(doc);
  } catch (e) {
    console.error('[banner-config.create]', e);
    res.status(400).json({ error: e.message });
  }
};

// ---------- update ----------
exports.update = async (req, res) => {
  try {
    const updates = {};
    if (req.body.mode) updates.mode = req.body.mode;

    if (
      req.body.anchor ||
      req.body.anchorKind ||
      req.body.kind ||
      req.body.articleKey ||
      req.body.category ||
      req.body.nth ||
      req.body.startAfter
    ) {
      updates.anchor = buildAnchor(req.body);
    }

    if (
      req.body.payload ||
      req.body.headline ||
      req.body.imageUrl ||
      req.body.clickUrl ||
      req.body.deeplinkUrl ||
      req.body.customNewsId ||
      req.body.topic // ✅ allow top-level topic on update
    ) {
      updates.payload = buildPayload(req.body);
      // keep legacy mirrors in sync
      if (updates.payload.imageUrl)     updates.imageUrl     = updates.payload.imageUrl;
      if (updates.payload.customNewsId) updates.customNewsId = updates.payload.customNewsId;
      // (no legacy field for topic; it remains in payload.topic)
    }

    ['startAfter', 'repeatEvery', 'priority'].forEach((k) => {
      if (req.body[k] !== undefined) updates[k] = Number(req.body[k]);
    });
    if (req.body.isActive !== undefined)
      updates.isActive = !!JSON.parse(String(req.body.isActive));
    if (req.body.activeFrom) updates.activeFrom = new Date(req.body.activeFrom);
    if (req.body.activeTo)   updates.activeTo   = new Date(req.body.activeTo);
    if (req.body.message !== undefined) updates.message = req.body.message;

    const doc = await BannerConfig.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!doc) return res.status(404).json({ error: 'Not found' });
    res.json(doc);
  } catch (e) {
    console.error('[banner-config.update]', e);
    res.status(400).json({ error: e.message });
  }
};

// ---------- delete ----------
exports.remove = async (_req, res) => {
  await BannerConfig.findByIdAndDelete(_req.params.id);
  res.json({ ok: true });
};
