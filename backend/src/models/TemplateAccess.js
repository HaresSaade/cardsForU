const mongoose = require("mongoose");

const templateAccessSchema = new mongoose.Schema(
  {
    /*
    |--------------------------------------------------------------------------
    | Customer
    |--------------------------------------------------------------------------
    */

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    /*
    |--------------------------------------------------------------------------
    | Granted Template / Design
    |--------------------------------------------------------------------------
    */

    template: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Template",
      required: true,
      index: true
    },

    /*
    |--------------------------------------------------------------------------
    | Card Created From This Access
    |--------------------------------------------------------------------------
    |
    | Each access represents one use/event.
    |
    | Example:
    |
    | Wedding Template
    |     ↓
    | John's Wedding 2026
    |
    | The same customer can later receive another access to the same
    | template for another event.
    |
    */

    card: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Card",
      default: null
    },

    /*
    |--------------------------------------------------------------------------
    | Access Status
    |--------------------------------------------------------------------------
    */

    status: {
      type: String,
      enum: [
        "active",
        "disabled"
      ],
      default: "active",
      index: true
    },

    /*
    |--------------------------------------------------------------------------
    | Granted By
    |--------------------------------------------------------------------------
    |
    | Normally the CardsForU admin who sold/granted the design.
    |
    */

    grantedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    /*
    |--------------------------------------------------------------------------
    | Sale Information
    |--------------------------------------------------------------------------
    |
    | CardsForU currently handles sales manually.
    | This is informational and is NOT a payment gateway transaction.
    |
    */

    pricePaid: {
      type: Number,
      default: 0,
      min: 0
    },

    currency: {
      type: String,
      default: "USD",
      uppercase: true,
      trim: true
    },

    notes: {
      type: String,
      default: "",
      trim: true
    },

    /*
    |--------------------------------------------------------------------------
    | Event Label
    |--------------------------------------------------------------------------
    |
    | Helps distinguish multiple purchases of the same design.
    |
    | Examples:
    |
    | "John & Maria Wedding"
    | "Sarah Birthday 2027"
    | "Valentine 2027"
    |
    */

    eventLabel: {
      type: String,
      default: "",
      trim: true
    },

    /*
    |--------------------------------------------------------------------------
    | Grant Date
    |--------------------------------------------------------------------------
    */

    grantedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

/*
|--------------------------------------------------------------------------
| Indexes
|--------------------------------------------------------------------------
|
| IMPORTANT:
|
| We intentionally DO NOT use:
|
| { user: 1, template: 1 }, { unique: true }
|
| because one customer may purchase/use the same template multiple times.
|
*/

/*
| Quickly retrieve a customer's accesses.
*/
templateAccessSchema.index({
  user: 1,
  status: 1,
  createdAt: -1
});

/*
| Quickly retrieve access records for a template.
*/
templateAccessSchema.index({
  template: 1,
  status: 1
});

/*
| A card should belong to at most one TemplateAccess.
|
| sparse allows multiple records where card is null.
*/
templateAccessSchema.index(
  {
    card: 1
  },
  {
    unique: true,
    sparse: true
  }
);

module.exports = mongoose.model(
  "TemplateAccess",
  templateAccessSchema
);
