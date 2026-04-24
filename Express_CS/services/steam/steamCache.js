/**
 * Steam data cache — file-based persistence.
 *
 * Stores price history and lowest listing per skin to avoid
 * hitting Steam's rate limits on every request.
 *
 * TTL:
 *   - Price history : 24 hours
 *   - Lowest listing: 30 minutes
 *
 * Cache file location: /cache/steam-cache.json
 */

const fs   = require("fs");
const path = require("path");

const CACHE_FILE  = path.join(__dirname, "../../cache/steam-cache.json");
const TTL_HISTORY = 24 * 60 * 60 * 1000; // 24 hours
const TTL_LISTING = 30 * 60 * 1000;      // 30 minutes

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Reads and parses the cache file from disk.
 * Returns an empty object if the file does not exist or is corrupted.
 *
 * @returns {Object} Raw cache object
 */
function readCache() {
  try {
    if (!fs.existsSync(CACHE_FILE)) return {};
    const raw = fs.readFileSync(CACHE_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/**
 * Serializes and writes the cache object to disk.
 * Creates the cache directory if it does not exist.
 *
 * @param {Object} cache - Cache object to persist
 */
function writeCache(cache) {
  try {
    const dir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), "utf8");
  } catch (e) {
    console.error("Cache write error:", e.message);
  }
}

// ---------------------------------------------------------------------------
// Price history
// ---------------------------------------------------------------------------

/**
 * Retrieves cached price history for a given skin.
 * Returns null if the entry is missing or expired (TTL: 24h).
 *
 * @param {string} marketHashName - Steam market hash name (e.g. "AK-47 | Redline (Field-Tested)")
 * @returns {Array|null} Raw Steam price history array, or null on cache miss
 */
function getCachedHistory(marketHashName) {
  const cache = readCache();
  const key   = `history:${marketHashName}`;
  const entry = cache[key];

  if (!entry) return null;

  if (Date.now() - entry.ts > TTL_HISTORY) {
    console.log(`[Cache] History expired for: ${marketHashName}`);
    return null;
  }

  console.log(`[Cache] History hit for: ${marketHashName}`);
  return entry.data;
}

/**
 * Saves price history to the cache for a given skin.
 *
 * @param {string} marketHashName - Steam market hash name
 * @param {Array}  data           - Raw Steam price history array
 */
function setCachedHistory(marketHashName, data) {
  const cache = readCache();
  cache[`history:${marketHashName}`] = { ts: Date.now(), data };
  writeCache(cache);
}

// ---------------------------------------------------------------------------
// Lowest listing
// ---------------------------------------------------------------------------

/**
 * Retrieves cached lowest listing price for a given skin.
 * Returns null if the entry is missing or expired (TTL: 30min).
 *
 * @param {string} marketHashName - Steam market hash name
 * @returns {Object|null} { lowest_price, median_price } or null on cache miss
 */
function getCachedListing(marketHashName) {
  const cache = readCache();
  const key   = `listing:${marketHashName}`;
  const entry = cache[key];

  if (!entry) return null;

  if (Date.now() - entry.ts > TTL_LISTING) {
    console.log(`[Cache] Listing expired for: ${marketHashName}`);
    return null;
  }

  console.log(`[Cache] Listing hit for: ${marketHashName}`);
  return entry.data;
}

/**
 * Saves lowest listing data to the cache for a given skin.
 *
 * @param {string} marketHashName - Steam market hash name
 * @param {Object} data           - { lowest_price, median_price }
 */
function setCachedListing(marketHashName, data) {
  const cache = readCache();
  cache[`listing:${marketHashName}`] = { ts: Date.now(), data };
  writeCache(cache);
}

module.exports = {
  getCachedHistory,
  setCachedHistory,
  getCachedListing,
  setCachedListing
};