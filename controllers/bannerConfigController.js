// controllers/bannerConfigController.js
// Full drop-in with per-section targeting support (+active window filtering)

const BannerConfig = require('../models/BannerConfig');

/* ------------------------ helpers ------------------------ */
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
    topic, // optional; stored inside payload
  };
}

function toArr(v) {
  if (v === undefined || v === null) return [];
  if (Array.isArray(v)) return v.map(String).map((s) => s.trim()).filter(Boolean);
  if (typeof v === 'string') {
    return v
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

// NEW: build per-section targets from body (supports both nested and flat fields)
function buildTargets(body = {}) {
  const src = body.targets || {};
  // sources (nested > flat)
  const includeAllRaw = src.includeAll ?? body.includeAll;

  const categories = toArr(src.categories ?? body.categories ?? body.sectionCategories).map((c) =>
    c.toLowerCase()
  );
  const cities = toArr(src.cities ?? body.cities);
  const states = toArr(src.states ?? body.states);

  const hasAny = categories.length > 0 || cities.length > 0 || states.length > 0;
  const includeAll = includeAllRaw !== undefined ? !!includeAllRaw : !hasAny;

  const t = {
    includeAll,
    categories: includeAll ? [] : categories,
    cities: includeAll ? [] : cities,
    states: includeAll ? [] : states,
  };
  return t;
}

// Keep controller-side specificity in sync with model logic
function computeSpecificity(t = {}) {
  if (!t || t.includeAll) return 0;
  if (Array.isArray(t.cities) && t.cities.length) return 3;
  if (Array.isArray(t.states) && t.states.length) return 2;
  if (Array.isArray(t.categories) && t.categories.length) return 1;
  return 0;
}

function hasTargetKeys(body = {}) {
  return (
    body.targets !== undefined ||
    'includeAll' in body ||
    'categories' in body ||
    'sectionCategories' in body ||
    'cities' in body ||
    'states' in body
  );
}

function buildActiveWindowFilter() {
  const now = new Date();
  return {
    $and: [
      { $or: [{ activeFrom: null }, { activeFrom: { $lte: now } }] },
      { $or: [{ activeTo: null }, { activeTo: { $gte: now } }] },
    ],
  };
}

/* ------------------------ list ------------------------ */
exports.list = async (req, res) => {
  try {
    const { mode, activeOnly, sectionType, sectionValue } = req.query;

    const base = {};
    if (mode) base.mode = mode;
    if (activeOnly === '1' || activeOnly === 'true') {
      base.isActive = true;
      Object.assign(base, buildActiveWindowFilter());
    }

    let query = base;
    if (sectionType && sectionValue) {
      const value =
        sectionType === 'category'
          ? String(sectionValue).trim().toLowerCase()
          : String(sectionValue).trim();

      const or = [{ 'targets.includeAll': true }];
      if (sectionType === 'category') or.push({ 'targets.categories': value });
      else if (sectionType === 'city') or.push({ 'targets.cities': value });
      else if (sectionType === 'state') or.push({ 'targets.states': value });

      query = { ...base, $or: or };
    }

    const docs = await BannerConfig.find(query).sort({
      specificityLevel: -1,
      priority: -1,
      updatedAt: -1,
      createdAt: -1,
    });

    res.json(docs);
  } catch (e) {
    console.error('[banner-config.list]', e);
    res.status(400).json({ error: e.message });
  }
};

/* ------------------------ get one ------------------------ */
exports.get = async (req, res) => {
  const doc = await BannerConfig.findById(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Not found' });
  res.json(doc);
};

/* ------------------------ create ------------------------ */
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

    const anchor = buildAnchor(req.body);
    const payload = buildPayload(req.body);
    const targets = buildTargets(req.body);
    const specificityLevel = computeSpecificity(targets);

    const doc = await BannerConfig.create({
      mode,
      anchor,
      payload,
      targets,
      specificityLevel,
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

/* ------------------------ update ------------------------ */
exports.update = async (req, res) => {
  try {
    const updates = {};
    if (req.body.mode) updates.mode = req.body.mode;

    // anchor
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

    // payload
    if (
      req.body.payload ||
      req.body.headline ||
      req.body.imageUrl ||
      req.body.clickUrl ||
      req.body.deeplinkUrl ||
      req.body.customNewsId ||
      req.body.topic // allow top-level topic on update
    ) {
      updates.payload = buildPayload(req.body);
      // keep legacy mirrors in sync
      if (updates.payload.imageUrl) updates.imageUrl = updates.payload.imageUrl;
      if (updates.payload.customNewsId)
        updates.customNewsId = updates.payload.customNewsId;
      // (no legacy field for topic; it remains in payload.topic)
    }

    // targets (per-section)
    if (hasTargetKeys(req.body)) {
      updates.targets = buildTargets(req.body);
      updates.specificityLevel = computeSpecificity(updates.targets);
    }

    ['startAfter', 'repeatEvery', 'priority'].forEach((k) => {
      if (req.body[k] !== undefined) updates[k] = Number(req.body[k]);
    });
    if (req.body.isActive !== undefined)
      updates.isActive = !!JSON.parse(String(req.body.isActive));
    if (req.body.activeFrom) updates.activeFrom = new Date(req.body.activeFrom);
    if (req.body.activeTo) updates.activeTo = new Date(req.body.activeTo);
    if (req.body.message !== undefined) updates.message = req.body.message;

    const doc = await BannerConfig.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });
    if (!doc) return res.status(404).json({ error: 'Not found' });
    res.json(doc);
  } catch (e) {
    console.error('[banner-config.update]', e);
    res.status(400).json({ error: e.message });
  }
};

/* ------------------------ delete ------------------------ */
exports.remove = async (_req, res) => {
  await BannerConfig.findByIdAndDelete(_req.params.id);
  res.json({ ok: true });
};
