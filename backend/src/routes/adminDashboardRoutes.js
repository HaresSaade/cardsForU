
const express = require("express");

const {
  getAdminDashboard,
  getMonthlyStatistics,
  getCustomerStatistics
} = require("../controllers/adminDashboardController");

const { protect } = require("../middleware/authMiddleware");
const { allowRoles } = require("../middleware/roleMiddleware");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Admin Dashboard Routes
|--------------------------------------------------------------------------
|
| All routes require:
| 1. Valid JWT authentication
| 2. Administrator role
|
*/

router.use(protect);
router.use(allowRoles("admin"));

/*
|--------------------------------------------------------------------------
| Dashboard Overview
|--------------------------------------------------------------------------
*/

// Platform-wide statistics and recent activity
router.get("/", getAdminDashboard);

/*
|--------------------------------------------------------------------------
| Monthly Statistics
|--------------------------------------------------------------------------
*/

// Last 12 months of platform activity
router.get("/monthly", getMonthlyStatistics);

/*
|--------------------------------------------------------------------------
| Customer Statistics
|--------------------------------------------------------------------------
*/

// Customer accounts, cards, design grants and spending
router.get("/customers", getCustomerStatistics);

module.exports = router;
