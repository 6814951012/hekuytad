const mongoose = require("mongoose");
const Bet = require("../models/Bet");
const User = require("../models/user.model");
const WalletTransaction = require("../models/WalletTransaction");

const walletError = (statusCode, message) => Object.assign(new Error(message), { statusCode });

const getWallet = async (req, res, next) => {
  try {
    const userId = req.user.sub;
    const [user, bets, transactions] = await Promise.all([
      User.findById(userId).select("walletBalance").lean(),
      Bet.find({ userId }).sort({ createdAt: -1 }).limit(10).lean(),
      WalletTransaction.find({ userId }).sort({ createdAt: -1 }).limit(10).lean(),
    ]);

    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ balance: user.walletBalance || 0, bets, transactions });
  } catch (error) { next(error); }
};

const topUpDemoCredits = async (req, res, next) => {
  const amount = Number(req.body?.amount);
  if (!Number.isSafeInteger(amount) || amount < 100 || amount > 10000) {
    return res.status(400).json({ message: "เติมเครดิตทดลองได้ครั้งละ 100 ถึง 10,000 เครดิต" });
  }

  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      const user = await User.findByIdAndUpdate(
        req.user.sub,
        { $inc: { walletBalance: amount } },
        { new: true, session }
      );
      if (!user) throw walletError(404, "User not found");

      await WalletTransaction.create([{
        userId: user._id,
        type: "DEMO_TOP_UP",
        amount,
        balanceAfter: user.walletBalance,
        note: "เติมเครดิตทดลอง ไม่มีมูลค่าเป็นเงินจริง",
      }], { session });

      result = { balance: user.walletBalance };
    });
    res.json(result);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
    next(error);
  } finally {
    await session.endSession();
  }
};

const placeBet = async (req, res, next) => {
  const stake = Number(req.body?.stake);
  const odds = Number(req.body?.odds);
  const matchName = typeof req.body?.matchName === "string" ? req.body.matchName.trim() : "";
  const selection = typeof req.body?.selection === "string" ? req.body.selection.trim() : "";

  if (!Number.isSafeInteger(stake) || stake < 1 || stake > 1000000) {
    return res.status(400).json({ message: "ยอดเดิมพันต้องเป็นจำนวนเต็มตั้งแต่ 1 ถึง 1,000,000 เครดิต" });
  }
  if (!Number.isFinite(odds) || odds < 1.01 || odds > 20) {
    return res.status(400).json({ message: "ราคาเดิมพันไม่ถูกต้อง" });
  }
  if (!matchName || matchName.length > 120 || !selection || selection.length > 80) {
    return res.status(400).json({ message: "กรุณาเลือกคู่และผลการแข่งขันที่ต้องการ" });
  }

  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      const user = await User.findOneAndUpdate(
        { _id: req.user.sub, walletBalance: { $gte: stake } },
        { $inc: { walletBalance: -stake } },
        { new: true, session }
      );
      if (!user) {
        const exists = await User.exists({ _id: req.user.sub }).session(session);
        throw exists
          ? walletError(400, "เครดิตไม่พอ กรุณาเติมเครดิตทดลอง")
          : walletError(404, "User not found");
      }

      const potentialReturn = Math.round(stake * odds);
      const [bet] = await Bet.create([{
        userId: user._id,
        matchName,
        selection,
        odds,
        stake,
        potentialReturn,
      }], { session });

      await WalletTransaction.create([{
        userId: user._id,
        type: "BET_PLACED",
        amount: stake,
        balanceAfter: user.walletBalance,
        betId: bet._id,
        note: `${matchName}: ${selection}`,
      }], { session });

      result = { bet, balance: user.walletBalance };
    });
    res.status(201).json(result);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
    next(error);
  } finally {
    await session.endSession();
  }
};

module.exports = { getWallet, topUpDemoCredits, placeBet };