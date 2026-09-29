const express = require("express");
const { getLeagues, getMatches, getFixtures, getStanding } = require("../controllers/football.controller");

const router = express.Router();
router.get("/leagues", getLeagues);
router.get("/matches", getMatches);
router.get("/fixtures", getFixtures);
router.get("/standings/:leagueId", getStanding);

module.exports = router;
