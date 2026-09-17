const express = require("express");

const {
  getUsers,
  getUserById,
  updateUser,
  disableUser,
  enableUser,
  deleteUser
} = require("../controllers/userController");

const { protect } = require("../middleware/authMiddleware");
const { allowRoles } = require("../middleware/roleMiddleware");

const router = express.Router();


// ======================================================
// ADMIN USER MANAGEMENT ROUTES
// ======================================================

// Get all users
router.get(
  "/",
  protect,
  allowRoles("admin"),
  getUsers
);

// Get one user
router.get(
  "/:id",
  protect,
  allowRoles("admin"),
  getUserById
);

// Update user details / role / active status
router.put(
  "/:id",
  protect,
  allowRoles("admin"),
  updateUser
);

// Disable user
router.put(
  "/:id/disable",
  protect,
  allowRoles("admin"),
  disableUser
);

// Enable user
router.put(
  "/:id/enable",
  protect,
  allowRoles("admin"),
  enableUser
);

// Permanently delete user
router.delete(
  "/:id",
  protect,
  allowRoles("admin"),
  deleteUser
);


module.exports = router;