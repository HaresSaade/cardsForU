
const mongoose = require("mongoose");
const InvitationRecipient = require("../models/InvitationRecipient");
const Card = require("../models/Card");
const RSVP = require("../models/RSVP");

const validId = (id) => mongoose.isValidObjectId(id);

const errorResponse = (res, error) => {
  console.error("Invitation recipient error:", error);

  if (error.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: Object.values(error.errors)
        .map((item) => item.message)
        .join(", ")
    });
  }

  if (error.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid field value"
    });
  }

  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "Duplicate invitation recipient relationship"
    });
  }

  return res.status(500).json({
    success: false,
    message: "An unexpected server error occurred"
  });
};

const checkCardAccess = async (req, res, cardId) => {
  if (!validId(cardId)) {
    res.status(400).json({
      success: false,
      message: "Invalid card ID"
    });
    return null;
  }

  const card = await Card.findById(cardId);

  if (!card) {
    res.status(404).json({
      success: false,
      message: "Card not found"
    });
    return null;
  }

  if (
    req.user.role !== "admin" &&
    card.owner.toString() !== req.user._id.toString()
  ) {
    res.status(403).json({
      success: false,
      message: "You cannot manage this card's guest list"
    });
    return null;
  }

  return card;
};

const getRecipientWithAccess = async (req, res) => {
  if (!validId(req.params.id)) {
    res.status(400).json({
      success: false,
      message: "Invalid recipient ID"
    });
    return null;
  }

  const recipient = await InvitationRecipient.findById(req.params.id);

  if (!recipient) {
    res.status(404).json({
      success: false,
      message: "Recipient not found"
    });
    return null;
  }

  const card = await checkCardAccess(req, res, recipient.card);

  if (!card) return null;

  return { recipient, card };
};

const normalizeRecipient = (input) => ({
  name: input.name,
  email: input.email || null,
  phone: input.phone || null,
  preferredChannel: input.preferredChannel || "manual",
  allowedGuests: input.allowedGuests ?? 1,
  notes: input.notes || "",
  group: input.group || ""
});

/*
|--------------------------------------------------------------------------
| Create One Recipient
|--------------------------------------------------------------------------
*/

const createRecipient = async (req, res) => {
  try {
    const { cardId } = req.body;

    const card = await checkCardAccess(req, res, cardId);
    if (!card) return;

    const recipient = await InvitationRecipient.create({
      ...normalizeRecipient(req.body),
      card: card._id,
      owner: card.owner
    });

    return res.status(201).json({
      success: true,
      message: "Recipient created successfully",
      recipient
    });
  } catch (error) {
    return errorResponse(res, error);
  }
};

/*
|--------------------------------------------------------------------------
| Bulk Create Recipients
|--------------------------------------------------------------------------
|
| Request:
| {
|   "cardId": "...",
|   "recipients": [
|     { "name": "John", "phone": "+961..." },
|     { "name": "Maria", "email": "maria@example.com" }
|   ]
| }
|
| Maximum 100 recipients per request.
| All entries are validated before insertion.
|--------------------------------------------------------------------------
*/

const bulkCreateRecipients = async (req, res) => {
  try {
    const { cardId, recipients } = req.body;

    const card = await checkCardAccess(req, res, cardId);
    if (!card) return;

    if (
      !Array.isArray(recipients) ||
      recipients.length === 0 ||
      recipients.length > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Provide between 1 and 100 recipients"
      });
    }

    const documents = recipients.map((item) => ({
      ...normalizeRecipient(item || {}),
      card: card._id,
      owner: card.owner
    }));

    const validationErrors = [];

    for (let i = 0; i < documents.length; i++) {
      const document = new InvitationRecipient(documents[i]);

      try {
        await document.validate();
      } catch (error) {
        validationErrors.push({
          row: i + 1,
          message: Object.values(error.errors || {})
            .map((item) => item.message)
            .join(", ")
        });
      }
    }

    if (validationErrors.length) {
      return res.status(400).json({
        success: false,
        message: "Some recipients failed validation",
        errors: validationErrors
      });
    }

    const created = await InvitationRecipient.insertMany(documents, {
      ordered: true
    });

    return res.status(201).json({
      success: true,
      message: "Recipients created successfully",
      count: created.length,
      recipients: created
    });
  } catch (error) {
    return errorResponse(res, error);
  }
};

/*
|--------------------------------------------------------------------------
| Get Recipients For A Card
|--------------------------------------------------------------------------
|
| Filters:
| ?deliveryStatus=not-sent
| ?rsvpStatus=attending
| ?group=family
| ?search=john
| ?page=1&limit=25
|--------------------------------------------------------------------------
*/

const getCardRecipients = async (req, res) => {
  try {
    const card = await checkCardAccess(req, res, req.params.cardId);
    if (!card) return;

    const filter = { card: card._id };

    if (req.query.deliveryStatus) {
      filter.deliveryStatus = req.query.deliveryStatus;
    }

    if (req.query.rsvpStatus) {
      filter.rsvpStatus = req.query.rsvpStatus;
    }

    if (req.query.group) {
      filter.group = req.query.group;
    }

    if (req.query.search) {
      const search = String(req.query.search)
        .slice(0, 100)
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } }
      ];
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit, 10) || 25)
    );

    const [recipients, total] = await Promise.all([
      InvitationRecipient.find(filter)
        .populate("rsvp", "status guestsCount createdAt")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      InvitationRecipient.countDocuments(filter)
    ]);

    return res.status(200).json({
      success: true,
      count: recipients.length,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      recipients
    });
  } catch (error) {
    return errorResponse(res, error);
  }
};

/*
|--------------------------------------------------------------------------
| Get One Recipient
|--------------------------------------------------------------------------
*/

const getRecipientById = async (req, res) => {
  try {
    const result = await getRecipientWithAccess(req, res);
    if (!result) return;

    await result.recipient.populate("rsvp");

    return res.status(200).json({
      success: true,
      recipient: result.recipient
    });
  } catch (error) {
    return errorResponse(res, error);
  }
};

/*
|--------------------------------------------------------------------------
| Update Recipient
|--------------------------------------------------------------------------
|
| Customers may edit contact details and guest information.
| Delivery/RSVP statuses are managed separately.
|--------------------------------------------------------------------------
*/

const updateRecipient = async (req, res) => {
  try {
    const result = await getRecipientWithAccess(req, res);
    if (!result) return;

    const { recipient } = result;

    const allowedFields = [
      "name",
      "email",
      "phone",
      "preferredChannel",
      "allowedGuests",
      "notes",
      "group",
      "isActive"
    ];

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        recipient[field] = req.body[field];
      }
    }

    await recipient.save();

    return res.status(200).json({
      success: true,
      message: "Recipient updated successfully",
      recipient
    });
  } catch (error) {
    return errorResponse(res, error);
  }
};

/*
|--------------------------------------------------------------------------
| Link An Existing RSVP
|--------------------------------------------------------------------------
|
| RSVP must belong to the same card.
| A response can only be linked to one recipient.
|--------------------------------------------------------------------------
*/

const linkRecipientRSVP = async (req, res) => {
  try {
    const result = await getRecipientWithAccess(req, res);
    if (!result) return;

    const { recipient } = result;
    const { rsvpId } = req.body;

    if (!validId(rsvpId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid RSVP ID"
      });
    }

    const rsvp = await RSVP.findById(rsvpId);

    if (!rsvp || rsvp.card.toString() !== recipient.card.toString()) {
      return res.status(404).json({
        success: false,
        message: "RSVP not found for this card"
      });
    }

    const alreadyLinked = await InvitationRecipient.findOne({
      rsvp: rsvp._id,
      _id: { $ne: recipient._id }
    });

    if (alreadyLinked) {
      return res.status(409).json({
        success: false,
        message: "This RSVP is linked to another recipient"
      });
    }

    recipient.rsvp = rsvp._id;
    recipient.rsvpStatus = rsvp.status;

    await recipient.save();

    return res.status(200).json({
      success: true,
      message: "RSVP linked successfully",
      recipient
    });
  } catch (error) {
    return errorResponse(res, error);
  }
};

/*
|--------------------------------------------------------------------------
| Update Delivery Status
|--------------------------------------------------------------------------
|
| This is for manual tracking or future delivery-provider callbacks.
| It does not send invitations.
|--------------------------------------------------------------------------
*/

const updateDeliveryStatus = async (req, res) => {
  try {
    const result = await getRecipientWithAccess(req, res);
    if (!result) return;

    const { recipient } = result;
    const { deliveryStatus } = req.body;

    const allowedStatuses = [
      "not-sent",
      "queued",
      "sent",
      "delivered",
      "failed"
    ];

    if (!allowedStatuses.includes(deliveryStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid delivery status"
      });
    }

    recipient.deliveryStatus = deliveryStatus;

    if (deliveryStatus === "not-sent") {
      recipient.sentAt = null;
      recipient.deliveredAt = null;
    } else if (deliveryStatus === "queued" || deliveryStatus === "failed") {
      recipient.deliveredAt = null;
    } else if (deliveryStatus === "sent") {
      recipient.sentAt = recipient.sentAt || new Date();
      recipient.deliveredAt = null;
    } else if (deliveryStatus === "delivered") {
      recipient.sentAt = recipient.sentAt || new Date();
      recipient.deliveredAt = new Date();
    }

    await recipient.save();

    return res.status(200).json({
      success: true,
      message: "Delivery status updated",
      recipient
    });
  } catch (error) {
    return errorResponse(res, error);
  }
};

/*
|--------------------------------------------------------------------------
| Guest List Statistics
|--------------------------------------------------------------------------
*/

const getRecipientSummary = async (req, res) => {
  try {
    const card = await checkCardAccess(req, res, req.params.cardId);
    if (!card) return;

    const stats = await InvitationRecipient.aggregate([
      { $match: { card: card._id, isActive: true } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          totalAllowedGuests: { $sum: "$allowedGuests" },
          pending: {
            $sum: { $cond: [{ $eq: ["$rsvpStatus", "pending"] }, 1, 0] }
          },
          attending: {
            $sum: { $cond: [{ $eq: ["$rsvpStatus", "attending"] }, 1, 0] }
          },
          notAttending: {
            $sum: { $cond: [{ $eq: ["$rsvpStatus", "not-attending"] }, 1, 0] }
          },
          maybe: {
            $sum: { $cond: [{ $eq: ["$rsvpStatus", "maybe"] }, 1, 0] }
          },
          sent: {
            $sum: {
              $cond: [
                { $in: ["$deliveryStatus", ["sent", "delivered"]] },
                1,
                0
              ]
            }
          },
          notSent: {
            $sum: {
              $cond: [
                { $eq: ["$deliveryStatus", "not-sent"] },
                1,
                0
              ]
            }
          },
          failed: {
            $sum: {
              $cond: [{ $eq: ["$deliveryStatus", "failed"] }, 1, 0]
            }
          }
        }
      }
    ]);

    return res.status(200).json({
      success: true,
      summary: stats[0] || {
        total: 0,
        totalAllowedGuests: 0,
        pending: 0,
        attending: 0,
        notAttending: 0,
        maybe: 0,
        sent: 0,
        notSent: 0,
        failed: 0
      }
    });
  } catch (error) {
    return errorResponse(res, error);
  }
};

/*
|--------------------------------------------------------------------------
| Delete Recipient
|--------------------------------------------------------------------------
|
| Removes guest-list entry, not the RSVP record itself.
|--------------------------------------------------------------------------
*/

const deleteRecipient = async (req, res) => {
  try {
    const result = await getRecipientWithAccess(req, res);
    if (!result) return;

    await result.recipient.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Recipient deleted successfully"
    });
  } catch (error) {
    return errorResponse(res, error);
  }
};

module.exports = {
  createRecipient,
  bulkCreateRecipients,
  getCardRecipients,
  getRecipientById,
  updateRecipient,
  linkRecipientRSVP,
  updateDeliveryStatus,
  getRecipientSummary,
  deleteRecipient
};
