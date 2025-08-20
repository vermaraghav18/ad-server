// models/liveUpdateHubEntry.js  (or the file where the entry schema is defined)
const mongoose = require('mongoose');

const LiveUpdateHubEntrySchema = new mongoose.Schema({
  sectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'LiveUpdateHubSection', required: true },
  imageUrl: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  targetUrl: { type: String, default: '' },
  sortIndex: { type: Number, default: 0 },
  enabled: { type: Boolean, default: true },

  // ⬇️ NEW
  source: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('LiveUpdateHubEntry', LiveUpdateHubEntrySchema);
