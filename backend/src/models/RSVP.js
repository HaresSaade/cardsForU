const mongoose = require("mongoose");

const rsvpSchema = new mongoose.Schema(
  {
    card: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Card",
      required: true
    },

    name: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      trim: true,
      lowercase: true
    },

    phone: {
      type: String,
      trim: true
    },

    status: {
      type: String,
      enum: ["attending", "not-attending", "maybe"],
      required: true
    },

    guestsCount: {
      type: Number,
      default: 1,
      min: 0
    },

    answers: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("RSVP", rsvpSchema);