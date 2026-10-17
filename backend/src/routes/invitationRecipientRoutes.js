
const express = require("express");

const {
  createRecipient,
  bulkCreateRecipients,
  getCardRecipients,
  getRecipientById,
  updateRecipient,
  linkRecipientRSVP,
  updateDeliveryStatus,
  getRecipientSummary,
  deleteRecipient
} = require("../controllers/invitationRecipientController");

const {
  protect
} = require("../middleware/authMiddleware");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Invitation Recipient Routes
|--------------------------------------------------------------------------
|
| All endpoints require authentication.
|
| The controller verifies that:
| - Customers only manage recipients for their own cards.
| - Admins can manage recipients across all cards.
|
*/

router.use(protect);

/*
|--------------------------------------------------------------------------
| Create Recipients
|--------------------------------------------------------------------------
*/

// Add one guest
router.post(
  "/",
  createRecipient
);

// Add up to 100 guests at once
router.post(
  "/bulk",
  bulkCreateRecipients
);

/*
|--------------------------------------------------------------------------
| Retrieve Recipients
|--------------------------------------------------------------------------
*/

// Get a card's complete guest list (paginated)
router.get(
  "/card/:cardId",
  getCardRecipients
);

// Get guest-list statistics
// Must be declared before the generic /:id route
router.get(
  "/card/:cardId/summary",
  getRecipientSummary
);

// Get one recipient
router.get(
  "/:id",
  getRecipientById
);

/*
|--------------------------------------------------------------------------
| Update Recipients
|--------------------------------------------------------------------------
*/

// Edit guest information
router.put(
  "/:id",
  updateRecipient
);

// Link an RSVP response to a recipient
router.put(
  "/:id/rsvp",
  linkRecipientRSVP
);

// Update invitation delivery tracking
router.put(
  "/:id/delivery",
  updateDeliveryStatus
);

/*
|--------------------------------------------------------------------------
| Delete Recipient
|--------------------------------------------------------------------------
*/

// Delete guest-list entry
router.delete(
  "/:id",
  deleteRecipient
);

module.exports = router;
