const mongoose = require('mongoose');

const LiveUpdateHubEntrySchema = new mongoose.Schema(
  {
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LiveUpdateHubSection',
      required: true,
      index: true,
    },
    imageUrl: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    targetUrl: { type: String, default: '' },
    sortIndex: { type: Number, default: 0 },
    enabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('LiveUpdateHubEntry', LiveUpdateHubEntrySchema);
