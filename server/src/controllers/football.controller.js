const League = require("../models/League");
const Match = require("../models/Match");
const Standing = require("../models/Standing");

const getLeagues = async (req, res, next) => {
  try { res.json(await League.find().sort({ name: 1 })); }
  catch (error) { next(error); }
};

const getMatches = async (req, res, next) => {
  try {
    const filter = req.query.leagueId ? { leagueId: req.query.leagueId } : {};
    const matches = await Match.find(filter).populate("leagueId", "name country logo").sort({ matchDate: 1 }).limit(30);
    res.json(matches);
  } catch (error) { next(error); }
};

const getStanding = async (req, res, next) => {
  try {
    const standing = await Standing.findOne({ leagueId: req.params.leagueId }).sort({ createdAt: -1 });
    if (!standing) return res.status(404).json({ message: "Standings not found" });
    res.json(standing);
  } catch (error) { next(error); }
};

module.exports = { getLeagues, getMatches, getStanding };
