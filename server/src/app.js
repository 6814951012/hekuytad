const express = require("express");
const cors = require("cors");
const trackRoutes = require("./routes/track.route");
const authRoutes = require("./routes/auth.route");
const footballRoutes = require("./routes/football.route");
const { notFound, errorHandler } = require("./middlewares/error.middleware");
const app = express();
// 1. Global middleware
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json());
// 2. Routes
app.get("/api/health", (req, res) => res.json({ status: "ok" }));
app.use("/api/auth", authRoutes);
app.use("/api/football", footballRoutes);
app.use("/api/tracks", trackRoutes);
// 3. Error handling — must be LAST
app.use(notFound);
app.use(errorHandler);
module.exports = app;
