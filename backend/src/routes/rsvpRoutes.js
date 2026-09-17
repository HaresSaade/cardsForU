const express = require("express");

const {
  createRSVP,
  getCardRSVPs,
  getRSVPById,
  updateRSVP,
  deleteRSVP,
  getRSVPSummary
} = require("../controllers/rsvpController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();


// ======================================================
// PUBLIC ROUTES
// ======================================================

// Guest submits RSVP for a card
router.post("/", createRSVP);


// ======================================================
// AUTHENTICATED CARD OWNER ROUTES
// ======================================================

// Get all RSVPs for one card
router.get(
  "/card/:cardId",
  protect,
  getCardRSVPs
);

// Get RSVP summary for one card
router.get(
  "/card/:cardId/summary",
  protect,
  getRSVPSummary
);

// Get one RSVP
router.get(
  "/:id",
  protect,
  getRSVPById
);

// Update RSVP
router.put(
  "/:id",
  protect,
  updateRSVP
);

// Delete RSVP
router.delete(
  "/:id",
  protect,
  deleteRSVP
);


module.exports = router;