const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    plan: {
      type: String,
      enum: ["basic", "premium", "business"],
      required: true
    },

    status: {
      type: String,
      enum: ["active", "cancelled", "expired"],
      default: "active"
    },

    startsAt: {
      type: Date,
      default: Date.now
    },

    expiresAt: {
      type: Date,
      default: null
    },

    paymentProvider: {
      type: String,
      default: null
    },

    paymentReference: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Subscription", subscriptionSchema);