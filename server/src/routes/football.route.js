const express = require("express");
const { getLeagues, getMatches, getStanding } = require("../controllers/football.controller");

const router = express.Router();
router.get("/leagues", getLeagues);
router.get("/matches", getMatches);
router.get("/standings/:leagueId", getStanding);

module.exports = router;
