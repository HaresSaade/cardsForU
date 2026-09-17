const mongoose = require("mongoose");

const assetSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    type: {
      type: String,
      enum: ["image", "audio", "video"],
      required: true
    },

    url: {
      type: String,
      required: true
    },

    publicId: {
      type: String
    },

    filename: {
      type: String
    },

    mimeType: {
      type: String
    },

    size: {
      type: Number
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Asset", assetSchema);