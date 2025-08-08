const mongoose = require('mongoose');

const TweetItemSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, unique: true }, // https://x.com/handle/status/123
    authorName: { type: String, default: '' },
    authorHandle: { type: String, default: '' },
    authorAvatar: { type: String, default: '' },
    text: { type: String, default: '' },
    media: [{ type: String }], // image/video URLs if we find any
    createdAtTweet: { type: Date },

    // placement
    sections: [{ type: String }],           // ["Top News","India",...]
    enabled: { type: Boolean, default: true },
    sortIndex: { type: Number, default: 0 },
    showInNews: { type: Boolean, default: true },
    injectEveryNCards: { type: Number, default: 5 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('TweetItem', TweetItemSchema);
