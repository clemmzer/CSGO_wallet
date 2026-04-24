/**
 * Portfolio route — GET /portfolio
 *
 * Requires authentication (Steam session).
 *
 * Fetches raw Steam data for each skin in the user's portfolio,
 * builds normalized skin objects, computes portfolio metrics,
 * and generates a time-series timeline.
 *
 * Query params:
 *   range: string — time range key (default: "30d")
 *
 * Response:
 *   {
 *     portfolio: { totalBuy, marketValue, unrealizedPnL, unrealizedPnLPct },
 *     timeline:  [{ time, valeur, ...skinPrices }],
 *     current:   { lowestListing: number },
 *     skins:     Skin[],
 *     meta:      { range, updatedAt, skinsCount }
 *   }
 */

const express = require("express");
const router  = express.Router();

const { requireAuth }         = require("../middleware/auth");
const { portfolios }          = require("../store");
const { buildSkin }           = require("../services/steam/buildSkin");
const { buildPortfolio }      = require("../services/portfolio/buildPortfolio");
const { buildTimeline }       = require("../services/timeline/buildTimeline");
const { getUserSkinsRawData } = require("../services/user/getUserSkinsRawData");

router.get("/", requireAuth, async (req, res) => {
  try {
    console.log(`[GET /portfolio] User: ${req.user?.steamId}`);

    const range = req.query.range || "30d";

    // Fetch raw Steam data for each skin in the portfolio
    const rawSkins = await getUserSkinsRawData(req.user.steamId, portfolios);

    console.log("[GET /portfolio] Raw skins received:", rawSkins.map(s => ({
      name:            s.name,
      steamHistoryLen: s.steamHistory?.length,
      historyLen:      s.history?.length
    })));

    // Build normalized skin objects
    const skins = rawSkins.map(s =>
      buildSkin(
        s.steamHistory ?? [], // raw Steam history (preferred)
        s.steamListing ?? {}, // raw Steam listing
        s                     // user data — may contain already-parsed history
      )
    );

    // Compute portfolio-level metrics
    const portfolio = buildPortfolio(skins);

    // Generate time-series timeline
    const timeline = buildTimeline(skins, range);

    // Sum of current lowest listing prices across all skins
    const currentLowest = skins.reduce(
      (sum, s) => sum + (s.lowestListingPrice ?? 0),
      0
    );

    res.json({
      portfolio,
      timeline,
      current: { lowestListing: currentLowest },
      skins,
      meta: {
        range,
        updatedAt:  Date.now(),
        skinsCount: skins.length
      }
    });

  } catch (err) {
    console.error("[GET /portfolio] Internal error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;