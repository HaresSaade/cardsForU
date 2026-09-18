const express = require("express");

const {
  createCard,
  getMyCards,
  getAllCards,
  getUserCards,
  getCardById,
  updateCard,
  deleteCard,
  publishCard,
  unpublishCard,
  getPublicCardBySlug
} = require("../controllers/cardController");

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
| Anyone with the card URL can access a published/shareable card.
|
*/

router.get(
  "/public/:slug",
  getPublicCardBySlug
);

/*
|--------------------------------------------------------------------------
| Customer Routes
|--------------------------------------------------------------------------
|
| Returns cards belonging to the currently logged-in user.
|
*/

router.get(
  "/my",
  protect,
  getMyCards
);

/*
|--------------------------------------------------------------------------
| Admin Routes
|--------------------------------------------------------------------------
|
| Admin can view every card in the system.
|
*/

router.get(
  "/admin",
  protect,
  allowRoles("admin"),
  getAllCards
);

/*
|--------------------------------------------------------------------------
| Admin - Cards For Specific User
|--------------------------------------------------------------------------
*/

router.get(
  "/user/:userId",
  protect,
  allowRoles("admin"),
  getUserCards
);

/*
|--------------------------------------------------------------------------
| Create Card
|--------------------------------------------------------------------------
|
| Customer:
| - Creates card for themselves.
| - cardController verifies TemplateAccess.
|
| Admin:
| - Can optionally provide ownerId to create the card for a customer.
|
*/

router.post(
  "/",
  protect,
  createCard
);

/*
|--------------------------------------------------------------------------
| Get Card By ID
|--------------------------------------------------------------------------
|
| Owner or admin.
|
*/

router.get(
  "/:id",
  protect,
  getCardById
);

/*
|--------------------------------------------------------------------------
| Update Card
|--------------------------------------------------------------------------
|
| Owner or admin.
|
*/

router.put(
  "/:id",
  protect,
  updateCard
);

/*
|--------------------------------------------------------------------------
| Publish Card
|--------------------------------------------------------------------------
*/

router.put(
  "/:id/publish",
  protect,
  publishCard
);

/*
|--------------------------------------------------------------------------
| Unpublish Card
|--------------------------------------------------------------------------
*/

router.put(
  "/:id/unpublish",
  protect,
  unpublishCard
);

/*
|--------------------------------------------------------------------------
| Delete Card
|--------------------------------------------------------------------------
|
| Owner or admin.
|
*/

router.delete(
  "/:id",
  protect,
  deleteCard
);

module.exports = router;
