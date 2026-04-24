/**
 * Skin builder.
 *
 * Aggregates raw Steam data (price history, lowest listing)
 * with user portfolio data to produce a normalized Skin object
 * ready to be consumed by the frontend.
 */

const { parsePriceHistory, getLastSale } = require("./parseHistory");
const { parseLowestListing }             = require("./parseListing");

/**
 * Builds a normalized Skin object from raw Steam and user data.
 *
 * History resolution order:
 *   1. userData.history (already parsed {t,p} — from a previous build cycle)
 *   2. steamHistoryRaw  (raw Steam array — freshly fetched or from cache)
 *
 * Market price resolution order:
 *   1. lowestListingPrice (Steam lowest listing)
 *   2. lastSalePrice      (last recorded sale)
 *   3. userData.marketPrice (previously known price — Steam rate-limit fallback)
 *   4. userData.buyPrice  (purchase price — last resort)
 *
 * @param {Array}  steamHistoryRaw - Raw Steam price history array
 * @param {Object} steamListingRaw - Raw Steam price overview response
 * @param {Object} userData        - User portfolio entry (skin metadata + buy info)
 * @returns {Object} Normalized Skin object
 */
function buildSkin(steamHistoryRaw, steamListingRaw, userData) {

  // Resolve price history — prefer already-parsed data to avoid double parsing
  const history = userData.history?.length
    ? parsePriceHistory(userData.history)
    : parsePriceHistory(steamHistoryRaw);

  const { lastSalePrice }          = getLastSale(history);
  const { price: lowestListingPrice } = parseLowestListing(steamListingRaw);

  // Resolve current market price with fallback chain
  const marketPrice =
    lowestListingPrice      ??
    lastSalePrice           ??
    userData.marketPrice    ??
    userData.buyPrice       ??
    0;

  const skin = {
    id:      userData.id,
    name:    userData.fullName ?? userData.name ?? "Unknown",
    weapon:  userData.weapon   ?? "Unknown",
    image:   userData.image    ?? null,
    color:   userData.color    ?? "#888",

    buy:         userData.buyPrice ?? userData.buy ?? 0,
    marketPrice,

    buyPrice:           userData.buyPrice ?? userData.buy ?? 0,
    buyDate:            userData.buyDate  ?? null,
    lowestListingPrice: lowestListingPrice ?? null,
    lastSalePrice:      lastSalePrice      ?? null,
    history
  };

  console.log(`[buildSkin] ${skin.name} — history: ${skin.history.length} pts, market: ${skin.marketPrice}`);

  return skin;
}

module.exports = { buildSkin };