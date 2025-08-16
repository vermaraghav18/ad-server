const { extractFromUrl } = require('../utils/extractFromUrl');

exports.extract = async (req, res) => {
  try {
    const { url } = req.body || {};
    if (!url || !/^https?:\/\//i.test(url)) {
      return res.status(400).json({ error: 'Valid URL required.' });
    }
    const data = await extractFromUrl(url);
    return res.json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Extraction failed' });
  }
};
