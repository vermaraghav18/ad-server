// models/BannerConfig.js  (DROP-IN REPLACEMENT: adds per-section targeting)
// Back-compat preserved for existing fields and behavior.

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ---------- Enumerations for targeting ---------- */
const SECTION_CATEGORIES = ['top', 'finance'];

const CITIES = [
  'Ahmedabad',
  'Bangalore',
  'Bhopal',
  'Chennai',
  'Chandigarh',
  'Delhi',
  'Gurgaon',
  'Hyderabad',
  'Indore',
  'Jaipur',
  'Jalandhar',
  'Kanpur',
  'Kolkata',
  'Lucknow',
  'Mumbai',
  'Patna',
  'Pune',
  'Surat',
  'Vadodara',
  'Visakhapatnam',
];

const STATES = [
  'Delhi',
  'Punjab',
  'Maharashtra',
  'Tamil Nadu',
  'West Bengal',
  'Karnataka',
  'Uttar Pradesh',
  'Rajasthan',
  'Madhya-Pradesh',
  'Himachal Pradesh',
  'Andhra Pradesh',
  'Bihar',
  'Chhattisgarh',
  'Gujarat',
  'Haryana',
  'Kerala',
  'Jharkhand',
];

/* ---------- Subschemas ---------- */
const PayloadSchema = new Schema(
  {
    // Generic payload fields (both modes can use these)
    headline: { type: String },
    imageUrl: { type: String },
    clickUrl: { type: String }, // web target
    deeplinkUrl: { type: String }, // app target (optional)
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

// NEW: Per-section targeting (what sections this banner may show in)
const BannerTargetsSchema = new Schema(
  {
    includeAll: { type: Boolean, default: true }, // true => global (current behavior)
    categories: [{ type: String, enum: SECTION_CATEGORIES }], // e.g., ['top']
    cities: [{ type: String, enum: CITIES }], // e.g., ['Jalandhar']
    states: [{ type: String, enum: STATES }], // e.g., ['Punjab']
  },
  { _id: false }
);

/* ---------- Main Schema ---------- */
const BannerConfigSchema = new Schema(
  {
    // what to render
    mode: { type: String, enum: ['ad', 'news', 'empty'], required: true },

    // server-driven layout anchor
    anchor: { type: AnchorSchema, default: () => ({}) },

    // content payload (optional; old top-level fields still work)
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

    // -------- NEW: Per-section targeting --------
    // By default, behave exactly like today (global banners).
    targets: { type: BannerTargetsSchema, default: () => ({ includeAll: true }) },

    // Computed: how specific a config is (city 3 > state 2 > category 1 > all 0)
    specificityLevel: { type: Number, default: 0 },
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
    const nth = Math.max(1, Number(this.startAfter || 0)); // startAfter=0 -> nth=1 (after first article)
    this.anchor = this.anchor || {};
    this.anchor.kind = 'slot';
    this.anchor.nth = nth;
  }

  // -------- Targeting normalization + specificity --------
  const t = this.targets || {};
  // categories to lowercase
  if (Array.isArray(t.categories)) {
    this.targets.categories = t.categories
      .filter(Boolean)
      .map((c) => String(c).trim().toLowerCase());
  }

  const hasCities = Array.isArray(t.cities) && t.cities.length > 0;
  const hasStates = Array.isArray(t.states) && t.states.length > 0;
  const hasCats = Array.isArray(this.targets.categories) && this.targets.categories.length > 0;

  // If includeAll is true, clear arrays to avoid ambiguity
  if (t.includeAll === true) {
    this.targets.categories = [];
    this.targets.cities = [];
    this.targets.states = [];
  }

  // Compute specificity: city > state > category > all
  const includeAll = !!t.includeAll;
  this.specificityLevel = includeAll ? 0 : hasCities ? 3 : hasStates ? 2 : hasCats ? 1 : 0;

  // Minimal per-mode validation (stay lenient to allow admin drafts)
  if (this.mode === 'ad') {
    const img = this.payload?.imageUrl || this.imageUrl;
    if (!img) return next(new Error('imageUrl is required for ad mode'));
  }
  if (this.mode === 'news') {
    const hasNewsRef = !!(this.payload?.customNewsId || this.customNewsId);
    if (!hasNewsRef) {
      // allow a pure payload-based news (headline+click/deeplink) if provided
      const hasInline = !!(
        this.payload?.headline && (this.payload?.clickUrl || this.payload?.deeplinkUrl)
      );
      if (!hasInline)
        return next(
          new Error('customNewsId or payload (headline+url) is required for news mode')
        );
    }
  }

  next();
});

/* ---------- Indexes ---------- */
// Primary sort/filter: active, then most specific, then highest priority
BannerConfigSchema.index({ isActive: 1, specificityLevel: -1, priority: -1 });

// Anchor lookups (legacy + server-side selection)
BannerConfigSchema.index({ 'anchor.kind': 1, 'anchor.articleKey': 1 });
BannerConfigSchema.index({ 'anchor.kind': 1, 'anchor.category': 1 });
BannerConfigSchema.index({ 'anchor.kind': 1, 'anchor.nth': 1 });

// Legacy queries
BannerConfigSchema.index({ mode: 1, startAfter: 1 });

// NEW: Target-based filtering
BannerConfigSchema.index({ 'targets.includeAll': 1 });
BannerConfigSchema.index({ 'targets.categories': 1 });
BannerConfigSchema.index({ 'targets.cities': 1 });
BannerConfigSchema.index({ 'targets.states': 1 });

module.exports = mongoose.model('BannerConfig', BannerConfigSchema);
