const express = require("express");
const { getWallet, topUpDemoCredits, placeBet } = require("../controllers/wallet.controller");
const { requireAuth } = require("../middlewares/auth.middleware");

const router = express.Router();
router.use(requireAuth);
router.get("/", getWallet);
router.post("/top-up", topUpDemoCredits);
router.post("/bets", placeBet);

module.exports = router;