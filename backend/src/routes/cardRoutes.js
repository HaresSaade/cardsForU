const express = require("express");

const {
  createCard,
  getMyCards,
  getCardById,
  updateCard,
  deleteCard,
  publishCard,
  unpublishCard,
  getPublicCardBySlug
} = require("../controllers/cardController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Public route
router.get("/public/:slug", getPublicCardBySlug);

// Authenticated routes
router.get("/my", protect, getMyCards);

router.get("/:id", protect, getCardById);

router.post("/", protect, createCard);

router.put("/:id", protect, updateCard);

router.delete("/:id", protect, deleteCard);

router.put("/:id/publish", protect, publishCard);

router.put("/:id/unpublish", protect, unpublishCard);

module.exports = router;