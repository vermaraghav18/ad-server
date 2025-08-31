// ad-server/models/cartoonHubEntry.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const CartoonHubEntrySchema = new Schema(
  {
    sectionId: { type: Schema.Types.ObjectId, ref: 'CartoonHubSection', required: true },
    imageUrl: { type: String, required: true, trim: true }, // Cloudinary URL or any HTTPS image
    caption: { type: String, default: '', trim: true },     // optional
    sortIndex: { type: Number, default: 0 },
    enabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CartoonHubEntry', CartoonHubEntrySchema);
