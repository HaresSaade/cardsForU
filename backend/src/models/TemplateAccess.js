const mongoose = require("mongoose");

const templateAccessSchema = new mongoose.Schema(
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
      ref: "Card",
      default: null
    },

    status: {
      type: String,
      enum: ["active", "disabled"],
      default: "active"
    },

    grantedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },

    pricePaid: {
      type: Number,
      default: 0,
      min: 0
    },

    notes: {
      type: String,
      default: ""
    },

    grantedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Prevent giving the same template twice to the same user
templateAccessSchema.index(
  { user: 1, template: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  "TemplateAccess",
  templateAccessSchema
);