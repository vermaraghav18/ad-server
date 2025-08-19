const mongoose = require("mongoose");

const liveEntrySchema = new mongoose.Schema(
  {
    topicId: { type: mongoose.Schema.Types.ObjectId, ref: "LiveTopic", required: true },
    summary: { type: String, required: true },
    imageUrl: { type: String },
    sourceName: { type: String },
    linkUrl: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("LiveEntry", liveEntrySchema);
