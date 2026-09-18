const express = require("express");

const {
  createTemplate,
  getTemplates,
  getTemplateBySlug,
  getAllTemplates,
  getTemplateById,
  updateTemplate,
  publishTemplate,
  archiveTemplate,
  moveTemplateToDraft,
  deleteTemplate
} = require("../controllers/templateController");

const {
  protect
} = require("../middleware/authMiddleware");

const {
  allowRoles
} = require("../middleware/roleMiddleware");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Public Routes
|--------------------------------------------------------------------------
|
| Only published templates are returned by these endpoints.
|
*/

/*
| Public template catalog
|
| Optional filters:
| /api/templates?category=wedding
| /api/templates?type=dynamic
*/
router.get(
  "/",
  getTemplates
);

/*
| Public template by slug
|
| Example:
| /api/templates/slug/elegant-wedding-01
*/
router.get(
  "/slug/:slug",
  getTemplateBySlug
);

/*
|--------------------------------------------------------------------------
| Admin / Designer Routes
|--------------------------------------------------------------------------
*/

/*
| Get all templates
|
| Includes:
| - draft
| - published
| - archived
|
| Optional:
| /api/templates/manage?status=draft
| /api/templates/manage?category=wedding
*/
router.get(
  "/manage",
  protect,
  allowRoles("admin", "designer"),
  getAllTemplates
);

/*
| Get a template by MongoDB ID
*/
router.get(
  "/id/:id",
  protect,
  allowRoles("admin", "designer"),
  getTemplateById
);

/*
| Create template
*/
router.post(
  "/",
  protect,
  allowRoles("admin", "designer"),
  createTemplate
);

/*
| Update template
*/
router.put(
  "/:id",
  protect,
  allowRoles("admin", "designer"),
  updateTemplate
);

/*
|--------------------------------------------------------------------------
| Template Status
|--------------------------------------------------------------------------
*/

/*
| Publish template
*/
router.put(
  "/:id/publish",
  protect,
  allowRoles("admin", "designer"),
  publishTemplate
);

/*
| Archive template
*/
router.put(
  "/:id/archive",
  protect,
  allowRoles("admin", "designer"),
  archiveTemplate
);

/*
| Move template back to draft
*/
router.put(
  "/:id/draft",
  protect,
  allowRoles("admin", "designer"),
  moveTemplateToDraft
);

/*
|--------------------------------------------------------------------------
| Delete Template
|--------------------------------------------------------------------------
|
| Admin only.
|
| Controller prevents deletion when the template is already referenced
| by Cards or TemplateAccess records.
|
*/

router.delete(
  "/:id",
  protect,
  allowRoles("admin"),
  deleteTemplate
);

module.exports = router;
