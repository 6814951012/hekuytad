const mongoose = require("mongoose");

const walletTransactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  type: { type: String, enum: ["DEMO_TOP_UP", "BET_PLACED"], required: true },
  amount: { type: Number, required: true, min: 1 },
  balanceAfter: { type: Number, required: true, min: 0 },
  betId: { type: mongoose.Schema.Types.ObjectId, ref: "Bet" },
  note: { type: String, maxlength: 160 },
}, { timestamps: true });

walletTransactionSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("WalletTransaction", walletTransactionSchema);