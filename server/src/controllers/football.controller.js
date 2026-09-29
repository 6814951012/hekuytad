const League = require("../models/League");
const Match = require("../models/Match");
const Standing = require("../models/Standing");

const fixtureLeagues = [
  { id: "4328", name: "English Premier League", country: "England" },
  { id: "4335", name: "Spanish La Liga", country: "Spain" },
  { id: "4331", name: "German Bundesliga", country: "Germany" },
  { id: "4332", name: "Italian Serie A", country: "Italy" },
  { id: "4334", name: "French Ligue 1", country: "France" },
  { id: "4480", name: "UEFA Champions League", country: "Europe" },
];
const fixturesCacheMs = 5 * 60 * 1000;
let fixturesCache;
let fixturesRequest;
const footballNewsFeedUrl = "https://feeds.bbci.co.uk/sport/football/rss.xml";
const footballNewsCacheMs = 15 * 60 * 1000;
let footballNewsCache;
let footballNewsRequest;

const decodeXml = (value = "") => value
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
  .replace(/&amp;/g, "&")
  .replace(/&lt;/g, "<")
  .replace(/&gt;/g, ">")
  .replace(/&quot;/g, '"')
  .replace(/&#39;|&apos;/g, "'")
  .trim();

const xmlTag = (xml, tag) => {
  const escapedTag = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = xml.match(new RegExp(`<${escapedTag}\\b[^>]*>([\\s\\S]*?)<\\/${escapedTag}>`, "i"));
  return match ? decodeXml(match[1]).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : "";
};

const xmlImage = (item) => {
  const candidates = [
    item.match(/<(?:media:thumbnail|media:content)\b[^>]*\burl=["']([^"']+)["']/i)?.[1],
    item.match(/<enclosure\b[^>]*\burl=["']([^"']+)["']/i)?.[1],
  ];
  return candidates.map((url) => decodeXml(url || "")).find((url) => /^https:\/\/(?:[a-z0-9-]+\.)*(?:bbc\.co\.uk|bbc\.com|bbci\.co\.uk)\//i.test(url)) || "";
};

const loadFootballNews = async () => {
  const response = await fetch(footballNewsFeedUrl, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`BBC Sport feed returned ${response.status}`);
  const xml = await response.text();
  const articles = [...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)].map((match) => {
    const item = match[1];
    const link = xmlTag(item, "link");
    if (!/^https:\/\/(www\.)?bbc\.(co\.uk|com)\/sport\//i.test(link)) return null;
    return {
      title: xmlTag(item, "title"),
      link,
      image: xmlImage(item),
      publishedAt: xmlTag(item, "pubDate"),
      source: "BBC Sport",
    };
  }).filter((article) => article?.title && article.link).slice(0, 12);

  if (!articles.length) throw new Error("BBC Sport feed contained no usable football headlines");
  return articles;
};

const getFootballNews = async (req, res, next) => {
  try {
    if (footballNewsCache && footballNewsCache.expiresAt > Date.now()) {
      return res.json({ source: "BBC Sport", updatedAt: footballNewsCache.updatedAt, articles: footballNewsCache.articles });
    }
    if (!footballNewsRequest) {
      footballNewsRequest = loadFootballNews().then((articles) => {
        footballNewsCache = { articles, updatedAt: new Date().toISOString(), expiresAt: Date.now() + footballNewsCacheMs };
        return footballNewsCache;
      }).finally(() => { footballNewsRequest = null; });
    }
    const data = await footballNewsRequest;
    res.json({ source: "BBC Sport", updatedAt: data.updatedAt, articles: data.articles });
  } catch (error) {
    if (footballNewsCache) {
      return res.json({ source: "BBC Sport", updatedAt: footballNewsCache.updatedAt, articles: footballNewsCache.articles, stale: true });
    }
    next(error);
  }
};

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

const loadUpcomingFixtures = async () => {
  const results = await Promise.allSettled(fixtureLeagues.map(async (league) => {
    const response = await fetch(`https://www.thesportsdb.com/api/v1/json/3/eventsnextleague.php?id=${league.id}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`Fixture provider returned ${response.status}`);

    const data = await response.json();
    return (data.events || []).map((event) => ({
      id: event.idEvent,
      season: event.strSeason,
      round: event.intRound,
      matchDate: event.strTimestamp || `${event.dateEvent}T${event.strTime || "00:00:00"}`,
      status: event.strStatus || "NS",
      venue: event.strVenue || "",
      league: {
        id: league.id,
        name: event.strLeague || league.name,
        country: event.strCountry || league.country,
        logo: event.strLeagueBadge || "",
      },
      homeTeam: { name: event.strHomeTeam, logo: event.strHomeTeamBadge || "" },
      awayTeam: { name: event.strAwayTeam, logo: event.strAwayTeamBadge || "" },
      odds: { home: 2.00, draw: 3.20, away: 3.50 },
      oddsType: "DEMO",
    })).filter((event) => event.homeTeam.name && event.awayTeam.name && new Date(event.matchDate) > new Date());
  }));

  const successfulResults = results.filter((result) => result.status === "fulfilled");
  if (!successfulResults.length && results.length) throw results[0].reason;

  return successfulResults.flatMap((result) => result.value)
    .sort((first, second) => new Date(first.matchDate) - new Date(second.matchDate));
};

const getFixtures = async (req, res, next) => {
  try {
    if (fixturesCache && fixturesCache.expiresAt > Date.now()) {
      return res.json({ source: "TheSportsDB", season: "2026-2027", fixtures: fixturesCache.fixtures });
    }

    if (!fixturesRequest) {
      fixturesRequest = loadUpcomingFixtures().then((fixtures) => {
        fixturesCache = { fixtures, expiresAt: Date.now() + fixturesCacheMs };
        return fixtures;
      }).finally(() => { fixturesRequest = null; });
    }

    const fixtures = await fixturesRequest;
    res.json({ source: "TheSportsDB", season: "2026-2027", fixtures });
  } catch (error) { next(error); }
};

const getStanding = async (req, res, next) => {
  try {
    const standing = await Standing.findOne({ leagueId: req.params.leagueId }).sort({ createdAt: -1 });
    if (!standing) return res.status(404).json({ message: "Standings not found" });
    res.json(standing);
  } catch (error) { next(error); }
};

module.exports = { getLeagues, getMatches, getFixtures, getFootballNews, getStanding };
