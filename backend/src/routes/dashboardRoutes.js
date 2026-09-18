const express = require("express");

const {
  getMyDashboard
} = require("../controllers/dashboardController");

const {
  protect
} = require("../middleware/authMiddleware");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Customer Dashboard
|--------------------------------------------------------------------------
|
| Returns:
| - User information
| - Dashboard overview
| - Granted designs
| - Cards
| - Publishing status
| - Share paths
| - RSVP statistics
|
| Authentication required.
|
*/

router.get(
  "/",
  protect,
  getMyDashboard
);

module.exports = router;
