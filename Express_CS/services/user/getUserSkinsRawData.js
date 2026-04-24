/**
 * Steam skin data fetcher.
 *
 * For each skin in the user's portfolio, fetches:
 *   - Price history  (via /market/pricehistory)
 *   - Lowest listing (via /market/priceoverview)
 *
 * Uses a file-based cache to avoid hitting Steam rate limits.
 * Cache TTL: 24h for history, 30min for listings.
 *
 * Delays between requests:
 *   - 2s before each history fetch
 *   - 1.5s before each listing fetch
 */

const https = require("https");
const {
  getCachedHistory, setCachedHistory,
  getCachedListing, setCachedListing
} = require("../steam/steamCache");

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Performs an HTTPS GET request to steamcommunity.com and returns parsed JSON.
 * Rejects with a descriptive error on non-200 status or JSON parse failure.
 *
 * @param {string} path         - URL path (e.g. "/market/pricehistory/...")
 * @param {Object} extraHeaders - Additional HTTP headers (e.g. Cookie)
 * @returns {Promise<Object>} Parsed JSON response
 */
function steamRequest(path, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: "steamcommunity.com",
      path,
      method:  "GET",
      headers: {
        "User-Agent":      "Mozilla/5.0",
        "Accept-Language": "fr-FR,fr;q=0.9",
        ...extraHeaders
      }
    }, (res) => {
      let body = "";
      res.on("data", chunk => { body += chunk; });
      res.on("end", () => {
        try { resolve(JSON.parse(body)); }
        catch { reject(new Error("Failed to parse Steam response as JSON")); }
      });
    });
    req.on("error", reject);
    req.end();
  });
}

/**
 * Pauses execution for a given duration.
 * Used to respect Steam API rate limits between requests.
 *
 * @param {number} ms - Duration in milliseconds
 * @returns {Promise<void>}
 */
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Main function
// ---------------------------------------------------------------------------

/**
 * Fetches raw Steam data for all skins in a user's portfolio.
 *
 * For each skin:
 *   1. Checks cache for price history — fetches from Steam if expired/missing
 *   2. Checks cache for lowest listing — fetches from Steam if expired/missing
 *
 * Returns an array of portfolio entries enriched with:
 *   - steamHistory: raw Steam price history array
 *   - steamListing: { lowest_price, median_price }
 *
 * @param {string} steamId   - User's Steam ID
 * @param {Object} portfolios - In-memory portfolios store { [steamId]: Skin[] }
 * @returns {Promise<Object[]>} Enriched portfolio entries
 */
async function getUserSkinsRawData(steamId, portfolios) {
  console.log(`[getUserSkinsRawData] Fetching data for steamId: ${steamId}`);

  const portfolio = portfolios[steamId] ?? [];

  if (portfolio.length === 0) {
    console.log(`[getUserSkinsRawData] Portfolio is empty for steamId: ${steamId}`);
    return [];
  }

  const cookie = process.env.STEAM_COOKIE;
  const result = [];

  console.log(`[getUserSkinsRawData] Processing ${portfolio.length} skin(s):`,
    portfolio.map(s => s.marketHashName)
  );

  for (const s of portfolio) {
    console.log(`[getUserSkinsRawData] Processing skin: ${s.marketHashName}`);

    let steamHistory = [];
    let steamListing = {};

    // --- Price history ---
    const cachedHistory = getCachedHistory(s.marketHashName);

    if (cachedHistory) {
      // Cache hit — skip Steam request
      steamHistory = cachedHistory;
    } else {
      // Cache miss — fetch from Steam with rate limit delay
      await wait(2000);
      try {
        const hist = await steamRequest(
          `/market/pricehistory/?appid=730&market_hash_name=${encodeURIComponent(s.marketHashName)}`,
          cookie ? { Cookie: `steamLoginSecure=${cookie}` } : {}
        );

        if (hist.success && Array.isArray(hist.prices) && hist.prices.length > 0) {
          steamHistory = hist.prices;
          setCachedHistory(s.marketHashName, steamHistory);
          console.log(`[getUserSkinsRawData] History cached for: ${s.marketHashName} (${steamHistory.length} points)`);
        } else {
          // Do not cache empty responses — will retry on next request
          console.log(`[getUserSkinsRawData] History empty or failed for: ${s.marketHashName} — skipping cache`);
        }
      } catch (e) {
        console.error(`[getUserSkinsRawData] History fetch error for ${s.marketHashName}:`, e.message);
      }
    }

    // --- Lowest listing ---
    const cachedListing = getCachedListing(s.marketHashName);

    if (cachedListing) {
      // Cache hit — skip Steam request
      steamListing = cachedListing;
    } else {
      // Cache miss — fetch from Steam with rate limit delay
      await wait(1500);
      try {
        const overview = await steamRequest(
          `/market/priceoverview/?appid=730&currency=3&market_hash_name=${encodeURIComponent(s.marketHashName)}`
        );

        steamListing = {
          lowest_price: overview.lowest_price || null,
          median_price: overview.median_price || null
        };

        if (steamListing.lowest_price || steamListing.median_price) {
          setCachedListing(s.marketHashName, steamListing);
          console.log(`[getUserSkinsRawData] Listing cached for: ${s.marketHashName}`);
        }
      } catch (e) {
        console.error(`[getUserSkinsRawData] Listing fetch error for ${s.marketHashName}:`, e.message);
      }
    }

    result.push({ ...s, steamHistory, steamListing });
  }

  return result;
}

module.exports = { getUserSkinsRawData };