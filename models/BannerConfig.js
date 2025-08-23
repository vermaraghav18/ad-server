// models/BannerConfig.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const BannerConfigSchema = new Schema(
  {
    mode: {
      type: String,
      enum: ['ad', 'news', 'empty'],
      required: true,
    },

    // Placement
    startAfter: {
      type: Number,
      min: 0,
      required: true,
      default: 0,
    },
    // null/undefined = show once
    repeatEvery: {
      type: Number,
      min: 1,
      default: null,
    },

    // Lower wins on overlaps
    priority: {
      type: Number,
      default: 100,
    },

    // On/off + optional date window
    isActive: {
      type: Boolean,
      default: true,
    },
    activeFrom: Date,
    activeTo: Date,

    // Content per mode
    // AD
    imageUrl: {
      type: String,
      default: null, // required when mode === 'ad'
    },

    // NEWS (reference existing CustomNews doc you already have)
    customNewsId: {
      type: Schema.Types.ObjectId,
      ref: 'CustomNews',
      default: null, // required when mode === 'news'
    },

    // EMPTY
    message: {
      type: String,
      default: 'Tap to read more',
    },
  },
  { timestamps: true }
);

// Cross-field validation per mode
BannerConfigSchema.pre('validate', function (next) {
  if (this.mode === 'ad' && !this.imageUrl) {
    return next(new Error('imageUrl is required for ad mode'));
  }
  if (this.mode === 'news' && !this.customNewsId) {
    return next(new Error('customNewsId is required for news mode'));
  }
  next();
});

// Helpful indexes
BannerConfigSchema.index({ isActive: 1, priority: 1 });
BannerConfigSchema.index({ mode: 1, startAfter: 1 });

module.exports = mongoose.model('BannerConfig', BannerConfigSchema);
