// …existing requires
const FeatureBannerGroup = require('../models/FeatureBannerGroup');

// CREATE
exports.createGroup = async (req, res) => {
  try {
    const {
      name, category, nth, priority, enabled, startAt, endAt,
      articleKey, // NEW
      items = []
    } = req.body;

    const normalizedItems = items.map(i => ({
      title: i.title,
      imageUrl: i.imageUrl || '',
      link: i.link || '',
      pubDate: i.pubDate || null,
      description: i.description || '' // NEW
    }));

    const group = await FeatureBannerGroup.create({
      name, category, nth, priority, enabled, startAt, endAt,
      articleKey: articleKey || '', // NEW
      items: normalizedItems
    });

    res.json(group);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
};

// UPDATE
exports.updateGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const g = await FeatureBannerGroup.findById(id);
    if (!g) return res.status(404).json({ error: 'Not found' });

    const {
      name, category, nth, priority, enabled, startAt, endAt,
      articleKey, // NEW
      items
    } = req.body;

    if (name !== undefined) g.name = name;
    if (category !== undefined) g.category = category;
    if (nth !== undefined) g.nth = Number(nth);
    if (priority !== undefined) g.priority = Number(priority);
    if (enabled !== undefined) g.enabled = !!enabled;
    if (startAt !== undefined) g.startAt = startAt || null;
    if (endAt !== undefined) g.endAt = endAt || null;
    if (articleKey !== undefined) g.articleKey = articleKey || ''; // NEW

    if (Array.isArray(items)) {
      g.items = items.map(i => ({
        title: i.title,
        imageUrl: i.imageUrl || '',
        link: i.link || '',
        pubDate: i.pubDate || null,
        description: i.description || '' // NEW
      }));
    }

    await g.save();
    res.json(g);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
};

// LIST (active by category) – unchanged logic, just returns new fields too
exports.listActiveByCategory = async (req, res) => {
  try {
    const { category } = req.query;
    const now = new Date();
    const q = {
      enabled: true,
      ...(category ? { category } : {}),
      $and: [
        { $or: [{ startAt: null }, { startAt: { $lte: now } }] },
        { $or: [{ endAt: null }, { endAt: { $gte: now } }] },
      ],
    };
    const groups = await FeatureBannerGroup.find(q).sort({ priority: -1, nth: 1 }).lean();
    res.json(groups);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
};
