
const mongoose = require("mongoose");

const invitationRecipientSchema = new mongoose.Schema(
  {
    // Invitation / event this guest belongs to
    card: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Card",
      required: true,
      index: true
    },

    // Customer who owns the guest list
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    // Guest information
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: null
    },

    phone: {
      type: String,
      trim: true,
      default: null
    },

    // Preferred way to receive invitation
    preferredChannel: {
      type: String,
      enum: ["email", "whatsapp", "sms", "manual"],
      default: "manual"
    },

    // Invitation delivery tracking
    deliveryStatus: {
      type: String,
      enum: [
        "not-sent",
        "queued",
        "sent",
        "delivered",
        "failed"
      ],
      default: "not-sent"
    },

    sentAt: {
      type: Date,
      default: null
    },

    deliveredAt: {
      type: Date,
      default: null
    },

    // RSVP response, if linked
    rsvp: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RSVP",
      default: null
    },

    // Guest's RSVP state
    rsvpStatus: {
      type: String,
      enum: [
        "pending",
        "attending",
        "not-attending",
        "maybe"
      ],
      default: "pending"
    },

    // Number of guests allowed on this invitation
    allowedGuests: {
      type: Number,
      default: 1,
      min: 1
    },

    // Internal customer notes
    notes: {
      type: String,
      trim: true,
      default: "",
      maxlength: 1000
    },

    // Optional grouping for guest management
    group: {
      type: String,
      trim: true,
      default: ""
    },

    // For future personalized invitation URLs
    invitationToken: {
      type: String,
      unique: true,
      sparse: true
    },

    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

/*
|--------------------------------------------------------------------------
| Validation
|--------------------------------------------------------------------------
|
| At least one contact method is required.
| Manual invitations can use either email or phone.
|
*/

invitationRecipientSchema.pre("validate", function () {
  if (!this.email && !this.phone) {
    this.invalidate(
      "email",
      "At least one contact method (email or phone) is required"
    );
  }

  if (
    this.preferredChannel === "email" &&
    !this.email
  ) {
    this.invalidate(
      "preferredChannel",
      "Email is required for email invitations"
    );
  }

  if (
    ["whatsapp", "sms"].includes(this.preferredChannel) &&
    !this.phone
  ) {
    this.invalidate(
      "preferredChannel",
      "Phone is required for WhatsApp or SMS invitations"
    );
  }

  if (
    this.sentAt &&
    this.deliveryStatus === "not-sent"
  ) {
    this.invalidate(
      "deliveryStatus",
      "A sent invitation cannot have a not-sent status"
    );
  }
});

/*
|--------------------------------------------------------------------------
| Indexes
|--------------------------------------------------------------------------
*/

// Quickly retrieve a card's guest list
invitationRecipientSchema.index({
  card: 1,
  createdAt: -1
});

// Filter recipients by delivery status
invitationRecipientSchema.index({
  card: 1,
  deliveryStatus: 1
});

// Filter recipients by RSVP status
invitationRecipientSchema.index({
  card: 1,
  rsvpStatus: 1
});

// Prevent linking one RSVP to multiple recipients
invitationRecipientSchema.index(
  { rsvp: 1 },
  {
    unique: true,
    partialFilterExpression: {
      rsvp: { $type: "objectId" }
    }
  }
);

module.exports = mongoose.model(
  "InvitationRecipient",
  invitationRecipientSchema
);
