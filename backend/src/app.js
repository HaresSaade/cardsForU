const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const templateRoutes = require("./routes/templateRoutes");
const cardRoutes = require("./routes/cardRoutes");
const templateAccessRoutes = require("./routes/templateAccessRoutes");
const rsvpRoutes = require("./routes/rsvpRoutes");
const assetRoutes = require("./routes/assetRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");

const app = express();

/*
|--------------------------------------------------------------------------
| Middleware
|--------------------------------------------------------------------------
*/

app.use(cors());

app.use(
  express.json({
    limit: "2mb"
  })
);

/*
|--------------------------------------------------------------------------
| Health Check
|--------------------------------------------------------------------------
*/

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "CardsForU API is running"
  });
});

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/users",
  userRoutes
);

app.use(
  "/api/templates",
  templateRoutes
);

app.use(
  "/api/cards",
  cardRoutes
);

app.use(
  "/api/template-access",
  templateAccessRoutes
);

app.use(
  "/api/rsvps",
  rsvpRoutes
);

app.use(
  "/api/assets",
  assetRoutes
);

app.use(
  "/api/dashboard",
  dashboardRoutes
);

/*
|--------------------------------------------------------------------------
| 404 Handler
|--------------------------------------------------------------------------
*/

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found"
  });
});

/*
|--------------------------------------------------------------------------
| Global Error Handler
|--------------------------------------------------------------------------
*/

app.use(
  (error, req, res, next) => {
    console.error(error);

    res.status(
      error.status || 500
    ).json({
      success: false,
      message:
        error.message ||
        "Internal server error"
    });
  }
);

module.exports = app;
