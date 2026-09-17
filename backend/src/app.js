const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const templateRoutes = require("./routes/templateRoutes");
const cardRoutes = require("./routes/cardRoutes");
const templateAccessRoutes = require("./routes/templateAccessRoutes");
const rsvpRoutes = require("./routes/rsvpRoutes");
const assetRoutes = require("./routes/assetRoutes");

const app = express();


// ======================================================
// MIDDLEWARE
// ======================================================

app.use(cors());

app.use(express.json());


// ======================================================
// HEALTH CHECK
// ======================================================

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "CardsForU API is running"
  });
});


// ======================================================
// ROUTES
// ======================================================

app.use("/api/auth", authRoutes);

app.use("/api/users", userRoutes);

app.use("/api/templates", templateRoutes);

app.use("/api/cards", cardRoutes);

app.use("/api/template-access", templateAccessRoutes);

app.use("/api/rsvps", rsvpRoutes);

app.use("/api/assets", assetRoutes);


// ======================================================
// 404 HANDLER
// ======================================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found"
  });
});


// ======================================================
// GLOBAL ERROR HANDLER
// ======================================================

app.use((error, req, res, next) => {
  console.error(error);

  res.status(error.status || 500).json({
    success: false,
    message: error.message || "Internal server error"
  });
});


module.exports = app;