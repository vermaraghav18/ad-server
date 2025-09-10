// controllers/tickerController.js
const Ticker = require('../models/tickerModel');

function activeWindowQuery(now) {
  return {
    $or: [
      { startAt: null, endAt: null },
      { startAt: { $lte: now }, endAt: null },
      { startAt: null, endAt: { $gte: now } },
      { startAt: { $lte: now }, endAt: { $gte: now } },
    ],
  };
}

// GET /api/tickers/plan?sectionType=state|city|category&sectionValue=Punjab
// Returns up to 5 items, ordered by specificity > sortIndex > updatedAt
exports.getPlan = async (req, res) => {
  try {
    const { sectionType, sectionValue } = req.query;
    const now = new Date();

    const base = { enabled: true, ...activeWindowQuery(now) };

    // Specificity order: exact match > global
    const items = await Ticker.find({
      $or: [
        { ...base, targetType: sectionType, targetValue: sectionValue },
        { ...base, targetType: 'global' },
      ],
    })
      .sort({ // exact match first
        targetType: sectionType ? -1 : 0,
        sortIndex: 1,
        updatedAt: -1,
      })
      .limit(5)
      .lean();

    res.json({ items });
  } catch (err) {
    console.error('[Ticker:getPlan] error', err);
    res.status(500).json({ error: 'Failed to fetch ticker plan' });
  }
};

// CRUD
exports.list = async (req, res) => {
  const items = await Ticker.find({}).sort({ updatedAt: -1 }).lean();
  res.json(items);
};

exports.create = async (req, res) => {
  try {
    const doc = await Ticker.create(req.body);
    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message || 'Validation error' });
  }
};

exports.update = async (req, res) => {
  try {
    const doc = await Ticker.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message || 'Update error' });
  }
};

exports.remove = async (req, res) => {
  await Ticker.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
};
