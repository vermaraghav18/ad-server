// ad-server/models/adModel.js
const mongoose = require('mongoose');

const adSchema = new mongoose.Schema({
  title: String,
  link: { type: String, required: true },
  target: { type: String, default: 'All' },
  description: String,
  type: { type: String, enum: ['normal', 'fullpage'], default: 'normal' },
  enabled: { type: Boolean, default: true },
  imageUrl: { type: String, required: true }, // Cloudinary URL
}, { timestamps: true });

module.exports = mongoose.model('Ad', adSchema);
