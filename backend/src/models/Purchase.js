const mongoose = require("mongoose");

const purchaseSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    template: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Template",
      required: true
    },

    card: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Card"
    },

    amount: {
      type: Number,
      required: true,
      min: 0
    },

    currency: {
      type: String,
      default: "USD"
    },

    status: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending"
    },

    paymentProvider: {
      type: String,
      default: null
    },

    paymentReference: {
      type: String,
      default: null
    },

    paidAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Purchase", purchaseSchema);