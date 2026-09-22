require("dotenv").config();

const app = require("../server/src/app");
const connectDB = require("../server/src/config/db");

module.exports = async (req, res) => {
  try {
    await connectDB();
    return app(req, res);
  } catch (error) {
    console.error("Function initialization failed", error);
    return res.status(503).json({ message: "Service is temporarily unavailable" });
  }
};
