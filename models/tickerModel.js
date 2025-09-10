// models/tickerModel.js
const mongoose = require('mongoose');

const TickerSchema = new mongoose.Schema(
  {
    message: { type: String, required: true, trim: true }, // freeform text
    targetType: {
      type: String,
      enum: ['global', 'category', 'state', 'city'],
      default: 'global',
    },
    targetValue: { type: String, default: null, trim: true }, // e.g. 'Punjab', 'Mumbai', 'Top', 'Finance'
    enabled: { type: Boolean, default: true },
    sortIndex: { type: Number, default: 0 }, // lower = earlier
    startAt: { type: Date, default: null },  // optional time window
    endAt: { type: Date, default: null },    // optional time window
  },
  { timestamps: true, versionKey: false }
);

TickerSchema.index({ enabled: 1, targetType: 1, targetValue: 1, startAt: 1, endAt: 1, sortIndex: 1 });

module.exports = mongoose.model('Ticker', TickerSchema);
