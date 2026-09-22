const express = require("express");
const cors = require("cors");
const trackRoutes = require("./routes/track.route");
const authRoutes = require("./routes/auth.route");
const footballRoutes = require("./routes/football.route");
const blobRoutes = require("./routes/blob.route");
const { notFound, errorHandler } = require("./middlewares/error.middleware");
const app = express();
// 1. Global middleware
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173").split(",").map((origin) => origin.trim());
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());
// 2. Routes
app.get("/api/health", (req, res) => res.json({ status: "ok" }));
app.use("/api/auth", authRoutes);
app.use("/api/football", footballRoutes);
app.use("/api/tracks", trackRoutes);
app.use("/api/blob", blobRoutes);
// 3. Error handling — must be LAST
app.use(notFound);
app.use(errorHandler);
module.exports = app;
