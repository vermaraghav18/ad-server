// controllers/spotlightController.js
const SpotlightSection = require('../models/SpotlightSection');
const SpotlightEntry = require('../models/SpotlightEntry');

const num = v => (v === '' || v === null || v === undefined ? undefined : Number(v));

/* ---------------------- Sections ---------------------- */
exports.listSections = async (req, res, next) => {
  try {
    const q = {};
    if (req.query.enabled !== undefined) q.enabled = req.query.enabled === 'true';
    if (req.query.scopeType) q.scopeType = req.query.scopeType;
    if (req.query.scopeValue) q.scopeValue = req.query.scopeValue;

    const rows = await SpotlightSection.find(q).sort({ updatedAt: -1 }).lean();
    res.json(rows);
  } catch (e) { next(e); }
};

exports.getSection = async (req, res, next) => {
  try {
    const row = await SpotlightSection.findById(req.params.id).lean();
    if (!row) return res.status(404).json({ message: 'Section not found' });
    res.json(row);
  } catch (e) { next(e); }
};

exports.createSection = async (req, res, next) => {
  try {
    const body = { ...req.body };
    body.afterNth = num(body.afterNth) ?? 0;
    body.repeatEvery = num(body.repeatEvery) ?? 0;
    body.repeatCount = num(body.repeatCount) ?? 0;

    const row = await SpotlightSection.create(body);
    res.status(201).json(row);
  } catch (e) { next(e); }
};

exports.updateSection = async (req, res, next) => {
  try {
    const body = { ...req.body };
    if ('afterNth' in body) body.afterNth = num(body.afterNth) ?? 0;
    if ('repeatEvery' in body) body.repeatEvery = num(body.repeatEvery) ?? 0;
    if ('repeatCount' in body) body.repeatCount = num(body.repeatCount) ?? 0;

    const row = await SpotlightSection.findByIdAndUpdate(
      req.params.id,
      body,
      { new: true, runValidators: true }
    ).lean();
    if (!row) return res.status(404).json({ message: 'Section not found' });
    res.json(row);
  } catch (e) { next(e); }
};

exports.deleteSection = async (req, res, next) => {
  try {
    await SpotlightSection.findByIdAndDelete(req.params.id);
    // also remove entries from this section (optional: cascade)
    await SpotlightEntry.deleteMany({ sectionId: req.params.id });
    res.json({ ok: true });
  } catch (e) { next(e); }
};

/* ----------------------- Entries ---------------------- */
exports.listEntries = async (req, res, next) => {
  try {
    const q = {};
    if (req.query.sectionId) q.sectionId = req.query.sectionId;
    if (req.query.enabled !== undefined) q.enabled = req.query.enabled === 'true';

    const rows = await SpotlightEntry
      .find(q)
      .sort({ sortIndex: 1, updatedAt: -1 })
      .lean();

    res.json(rows);
  } catch (e) { next(e); }
};

exports.getEntry = async (req, res, next) => {
  try {
    const row = await SpotlightEntry.findById(req.params.id).lean();
    if (!row) return res.status(404).json({ message: 'Entry not found' });
    res.json(row);
  } catch (e) { next(e); }
};

exports.createEntry = async (req, res, next) => {
  try {
    const body = { ...req.body };
    body.sortIndex = num(body.sortIndex) ?? 0;
    const row = await SpotlightEntry.create(body);
    res.status(201).json(row);
  } catch (e) { next(e); }
};

exports.updateEntry = async (req, res, next) => {
  try {
    const body = { ...req.body };
    if ('sortIndex' in body) body.sortIndex = num(body.sortIndex) ?? 0;

    const row = await SpotlightEntry.findByIdAndUpdate(
      req.params.id,
      body,
      { new: true, runValidators: true }
    ).lean();
    if (!row) return res.status(404).json({ message: 'Entry not found' });
    res.json(row);
  } catch (e) { next(e); }
};

exports.deleteEntry = async (req, res, next) => {
  try {
    await SpotlightEntry.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
};
