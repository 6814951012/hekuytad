const mongoose = require("mongoose");

const betSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  matchName: { type: String, required: true, trim: true, maxlength: 120 },
  selection: { type: String, required: true, trim: true, maxlength: 80 },
  odds: { type: Number, required: true, min: 1.01, max: 20 },
  stake: { type: Number, required: true, min: 1 },
  potentialReturn: { type: Number, required: true, min: 1 },
  status: { type: String, enum: ["PENDING", "WON", "LOST", "VOID"], default: "PENDING" },
}, { timestamps: true });

betSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("Bet", betSchema);