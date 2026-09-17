const express = require("express");

const {
  grantTemplateAccess,
  getMyTemplateAccess,
  getAllTemplateAccess,
  getUserTemplateAccess,
  attachCard,
  updateTemplateAccess,
  revokeTemplateAccess,
  restoreTemplateAccess,
  deleteTemplateAccess
} = require("../controllers/templateAccessController");

const { protect } = require("../middleware/authMiddleware");
const { allowRoles } = require("../middleware/roleMiddleware");

const router = express.Router();


// ======================================================
// CUSTOMER ROUTES
// ======================================================

// Logged-in user gets all designs/cards assigned to them
router.get(
  "/my",
  protect,
  getMyTemplateAccess
);


// ======================================================
// ADMIN ROUTES
// ======================================================

// Get every template access record
router.get(
  "/",
  protect,
  allowRoles("admin"),
  getAllTemplateAccess
);

// Get all template accesses for one specific user
router.get(
  "/user/:userId",
  protect,
  allowRoles("admin"),
  getUserTemplateAccess
);

// Grant a template/design to a user
router.post(
  "/",
  protect,
  allowRoles("admin"),
  grantTemplateAccess
);

// Attach a created card to an access record
router.put(
  "/:id/card",
  protect,
  allowRoles("admin"),
  attachCard
);

// Update access details
router.put(
  "/:id",
  protect,
  allowRoles("admin"),
  updateTemplateAccess
);

// Disable access
router.put(
  "/:id/revoke",
  protect,
  allowRoles("admin"),
  revokeTemplateAccess
);

// Restore access
router.put(
  "/:id/restore",
  protect,
  allowRoles("admin"),
  restoreTemplateAccess
);

// Permanently delete access record
router.delete(
  "/:id",
  protect,
  allowRoles("admin"),
  deleteTemplateAccess
);


module.exports = router;