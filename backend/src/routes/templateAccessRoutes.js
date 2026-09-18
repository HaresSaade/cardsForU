const express = require("express");

const {
  grantTemplateAccess,
  getMyTemplateAccess,
  getAllTemplateAccess,
  getUserTemplateAccess,
  getTemplateAccessById,
  attachCard,
  detachCard,
  updateTemplateAccess,
  revokeTemplateAccess,
  restoreTemplateAccess,
  deleteTemplateAccess
} = require("../controllers/templateAccessController");

const {
  protect
} = require("../middleware/authMiddleware");

const {
  allowRoles
} = require("../middleware/roleMiddleware");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Customer Routes
|--------------------------------------------------------------------------
|
| Customer can see all active template/design access granted to them.
|
*/

router.get(
  "/my",
  protect,
  getMyTemplateAccess
);

/*
|--------------------------------------------------------------------------
| Admin - Get All Template Access
|--------------------------------------------------------------------------
|
| Optional filters:
|
| /api/template-access?status=active
| /api/template-access?status=disabled
| /api/template-access?userId=...
| /api/template-access?templateId=...
|
*/

router.get(
  "/",
  protect,
  allowRoles("admin"),
  getAllTemplateAccess
);

/*
|--------------------------------------------------------------------------
| Admin - Access For Specific User
|--------------------------------------------------------------------------
*/

router.get(
  "/user/:userId",
  protect,
  allowRoles("admin"),
  getUserTemplateAccess
);

/*
|--------------------------------------------------------------------------
| Admin - Get Access By ID
|--------------------------------------------------------------------------
*/

router.get(
  "/:id",
  protect,
  allowRoles("admin"),
  getTemplateAccessById
);

/*
|--------------------------------------------------------------------------
| Admin - Grant Template Access
|--------------------------------------------------------------------------
|
| Each request represents one design/event grant.
|
| The same customer may receive the same template multiple times.
|
*/

router.post(
  "/",
  protect,
  allowRoles("admin"),
  grantTemplateAccess
);

/*
|--------------------------------------------------------------------------
| Admin - Attach Card
|--------------------------------------------------------------------------
*/

router.put(
  "/:id/card",
  protect,
  allowRoles("admin"),
  attachCard
);

/*
|--------------------------------------------------------------------------
| Admin - Detach Card
|--------------------------------------------------------------------------
*/

router.delete(
  "/:id/card",
  protect,
  allowRoles("admin"),
  detachCard
);

/*
|--------------------------------------------------------------------------
| Admin - Update Access
|--------------------------------------------------------------------------
|
| Editable information includes:
|
| - pricePaid
| - currency
| - notes
| - eventLabel
|
*/

router.put(
  "/:id",
  protect,
  allowRoles("admin"),
  updateTemplateAccess
);

/*
|--------------------------------------------------------------------------
| Admin - Revoke Access
|--------------------------------------------------------------------------
|
| Soft disable.
| Card and RSVP data remain intact.
|
*/

router.put(
  "/:id/revoke",
  protect,
  allowRoles("admin"),
  revokeTemplateAccess
);

/*
|--------------------------------------------------------------------------
| Admin - Restore Access
|--------------------------------------------------------------------------
*/

router.put(
  "/:id/restore",
  protect,
  allowRoles("admin"),
  restoreTemplateAccess
);

/*
|--------------------------------------------------------------------------
| Admin - Permanently Delete Access Record
|--------------------------------------------------------------------------
|
| Does NOT delete the associated Card.
|
*/

router.delete(
  "/:id",
  protect,
  allowRoles("admin"),
  deleteTemplateAccess
);

module.exports = router;
