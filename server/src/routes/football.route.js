const express = require("express");
const { getLeagues, getMatches, getFixtures, getFootballNews, getStanding } = require("../controllers/football.controller");

const router = express.Router();
router.get("/leagues", getLeagues);
router.get("/matches", getMatches);
router.get("/fixtures", getFixtures);
router.get("/news", getFootballNews);
router.get("/standings/:leagueId", getStanding);

module.exports = router;
