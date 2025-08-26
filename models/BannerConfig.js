// models/BannerConfig.js  (DROP-IN REPLACEMENT)
const mongoose = require('mongoose');
const { Schema } = mongoose;

const PayloadSchema = new Schema(
  {
    // Generic payload fields (both modes can use these)
    headline: { type: String },
    imageUrl: { type: String },
    clickUrl: { type: String },   // web target
    deeplinkUrl: { type: String },// app target (optional)
    // For news mode (optional; we’ll resolve details at runtime)
    customNewsId: { type: Schema.Types.ObjectId, ref: 'CustomNews' },
  },
  { _id: false }
);

const AnchorSchema = new Schema(
  {
    // where to render the banner relative to the feed
    kind: {
      type: String,
      enum: ['article', 'category', 'slot'],
      default: 'slot',
    },
    // article: stable key (same 'id' your /api/rss-agg returns for that story)
    articleKey: { type: String },
    // category: fallback when articleKey missing (lowercased on save)
    category: { type: String },
    // slot: Nth position (1-based). We render after that article.
    nth: { type: Number, min: 1, default: 10 },
  },
  { _id: false }
);

const BannerConfigSchema = new Schema(
  {
    // what to render
    mode: { type: String, enum: ['ad', 'news', 'empty'], required: true },

    // server-driven layout anchor (NEW)
    anchor: { type: AnchorSchema, default: () => ({}) },

    // content payload (NEW, optional; old top-level fields still work)
    payload: { type: PayloadSchema, default: () => ({}) },

    // -------- Back-compat (kept) --------
    // position-based legacy controls
    startAfter: { type: Number, min: 0, default: 0 }, // 0 => after first item
    repeatEvery: { type: Number, min: 1, default: null }, // null = once
    priority: { type: Number, default: 100 },

    // enable + optional date window
    isActive: { type: Boolean, default: true },
    activeFrom: Date,
    activeTo: Date,

    // legacy per-mode fields (still honored)
    imageUrl: { type: String, default: null }, // ad image
    customNewsId: {
      type: Schema.Types.ObjectId,
      ref: 'CustomNews',
      default: null,
    }, // news content
    message: { type: String, default: 'Tap to read more' }, // for empty/news copy
  },
  { timestamps: true, minimize: false }
);

/* ---------- Virtuals / Aliases ---------- */
// expose 'enabled' as an alias to isActive
BannerConfigSchema.virtual('enabled')
  .get(function () {
    return this.isActive;
  })
  .set(function (v) {
    this.isActive = !!v;
  });

/* ---------- Normalization / Back-compat ---------- */
BannerConfigSchema.pre('validate', function (next) {
  // default active window checks
  if (this.activeFrom && this.activeTo && this.activeFrom > this.activeTo) {
    return next(new Error('activeFrom must be <= activeTo'));
  }

  // normalize anchor.category to lowercase
  if (this.anchor && typeof this.anchor.category === 'string') {
    this.anchor.category = this.anchor.category.trim().toLowerCase();
  }

  // Back-compat: if no explicit anchor provided, derive from legacy fields
  if (!this.anchor || !this.anchor.kind) {
    // translate startAfter/repeatEvery into a primary slot (nth=startAfter or startAfter+1)
    const nth = Math.max(1, Number(this.startAfter || 0)) ; // startAfter=0 -> nth=1 (after first article)
    this.anchor = this.anchor || {};
    this.anchor.kind = 'slot';
    this.anchor.nth = nth;
  }

  // Minimal per-mode validation (but stay lenient to allow admin drafts)
  if (this.mode === 'ad') {
    const img = this.payload?.imageUrl || this.imageUrl;
    if (!img) return next(new Error('imageUrl is required for ad mode'));
  }
  if (this.mode === 'news') {
    const hasNewsRef = !!(this.payload?.customNewsId || this.customNewsId);
    if (!hasNewsRef) {
      // allow a pure payload-based news (headline+click/deeplink) if provided
      const hasInline = !!(this.payload?.headline && (this.payload?.clickUrl || this.payload?.deeplinkUrl));
      if (!hasInline) return next(new Error('customNewsId or payload (headline+url) is required for news mode'));
    }
  }
  next();
});

/* ---------- Indexes ---------- */
BannerConfigSchema.index({ isActive: 1, priority: -1 });
BannerConfigSchema.index({ 'anchor.kind': 1, 'anchor.articleKey': 1 });
BannerConfigSchema.index({ 'anchor.kind': 1, 'anchor.category': 1 });
BannerConfigSchema.index({ 'anchor.kind': 1, 'anchor.nth': 1 });
BannerConfigSchema.index({ mode: 1, startAfter: 1 }); // legacy queries

module.exports = mongoose.model('BannerConfig', BannerConfigSchema);
