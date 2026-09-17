const express = require("express");

const {
  createAsset,
  getMyAssets,
  getAssetById,
  updateAsset,
  deleteAsset
} = require("../controllers/assetController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();


// ======================================================
// AUTHENTICATED ASSET ROUTES
// ======================================================

// Get logged-in user's assets
router.get(
  "/my",
  protect,
  getMyAssets
);

// Get one asset
router.get(
  "/:id",
  protect,
  getAssetById
);

// Create asset record
router.post(
  "/",
  protect,
  createAsset
);

// Update asset metadata
router.put(
  "/:id",
  protect,
  updateAsset
);

// Delete asset record
router.delete(
  "/:id",
  protect,
  deleteAsset
);


module.exports = router;