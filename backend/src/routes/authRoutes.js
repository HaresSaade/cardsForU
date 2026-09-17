const express = require("express");

const {
  registerUser,
  loginUser,
  getMe,
  updateProfile,
  changePassword
} = require("../controllers/authController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();


// ======================================================
// PUBLIC AUTH ROUTES
// ======================================================

// Register account
router.post(
  "/register",
  registerUser
);

// Login
router.post(
  "/login",
  loginUser
);


// ======================================================
// AUTHENTICATED USER ROUTES
// ======================================================

// Get logged-in user's profile
router.get(
  "/me",
  protect,
  getMe
);

// Update logged-in user's profile
router.put(
  "/profile",
  protect,
  updateProfile
);

// Change password
router.put(
  "/change-password",
  protect,
  changePassword
);


module.exports = router;