const express = require("express");

const {
  createTemplate,
  getTemplates,
  getTemplateBySlug,
  getTemplateById,
  updateTemplate,
  deleteTemplate,
  publishTemplate,
  archiveTemplate
} = require("../controllers/templateController");

const { protect } = require("../middleware/authMiddleware");
const { allowRoles } = require("../middleware/roleMiddleware");

const router = express.Router();


// ======================================================
// PUBLIC ROUTES
// ======================================================

// Get all templates
router.get("/", getTemplates);

// Get one template by slug
router.get("/slug/:slug", getTemplateBySlug);


// ======================================================
// ADMIN / DESIGNER ROUTES
// ======================================================

// Get template by ID
router.get(
  "/id/:id",
  protect,
  allowRoles("admin", "designer"),
  getTemplateById
);

// Create template
router.post(
  "/",
  protect,
  allowRoles("admin", "designer"),
  createTemplate
);

// Update template
router.put(
  "/:id",
  protect,
  allowRoles("admin", "designer"),
  updateTemplate
);

// Publish template
router.put(
  "/:id/publish",
  protect,
  allowRoles("admin", "designer"),
  publishTemplate
);

// Archive template
router.put(
  "/:id/archive",
  protect,
  allowRoles("admin", "designer"),
  archiveTemplate
);

// Delete template
router.delete(
  "/:id",
  protect,
  allowRoles("admin"),
  deleteTemplate
);


module.exports = router;