// models/BannerConfig.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const BannerConfigSchema = new Schema(
  {
    mode: { type: String, enum: ['ad', 'news', 'empty'], required: true },

    // placement
    startAfter: { type: Number, min: 0, required: true, default: 0 },
    repeatEvery: { type: Number, min: 1, default: null }, // null = once
    priority: { type: Number, default: 100 },

    // enable + optional date window
    isActive: { type: Boolean, default: true },
    activeFrom: Date,
    activeTo: Date,

    // content
    imageUrl: { type: String, default: null },     // ad
    customNewsId: { type: Schema.Types.ObjectId, ref: 'CustomNews', default: null }, // news
    message: { type: String, default: 'Tap to read more' }, // empty
  },
  { timestamps: true }
);

BannerConfigSchema.pre('validate', function (next) {
  if (this.mode === 'ad' && !this.imageUrl) return next(new Error('imageUrl is required for ad mode'));
  if (this.mode === 'news' && !this.customNewsId) return next(new Error('customNewsId is required for news mode'));
  next();
});

BannerConfigSchema.index({ isActive: 1, priority: 1 });
BannerConfigSchema.index({ mode: 1, startAfter: 1 });

module.exports = mongoose.model('BannerConfig', BannerConfigSchema);
