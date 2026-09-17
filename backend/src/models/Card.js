const mongoose = require("mongoose");

const cardSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    template: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Template",
      required: true
    },

    title: {
      type: String,
      required: true,
      trim: true
    },

    slug: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true
    },

    status: {
      type: String,
      enum: ["draft", "published", "expired"],
      default: "draft"
    },

    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },

    customization: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },

    settings: {
      rsvpEnabled: {
        type: Boolean,
        default: false
      },

      musicEnabled: {
        type: Boolean,
        default: false
      },

      shareEnabled: {
        type: Boolean,
        default: true
      }
    },

    publishedAt: {
      type: Date,
      default: null
    },

    expiresAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Card", cardSchema);