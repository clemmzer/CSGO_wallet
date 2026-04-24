/**
 * Steam price history parser.
 *
 * Steam returns price history as an array of tuples:
 *   ["Mar 19 2026 01: +0", 149.104, "77"]
 *    ^date string           ^price   ^volume
 *
 * This module normalizes that format into { t: timestamp, p: price } objects,
 * and also handles already-parsed data (idempotent).
 */

// ---------------------------------------------------------------------------
// Date parsing
// ---------------------------------------------------------------------------

/**
 * Parses a Steam date string into a Unix timestamp (ms).
 * Steam format: "Mar 19 2026 01: +0" → normalized to "Mar 19 2026 01:00 +0000"
 *
 * @param {string} str - Raw Steam date string
 * @returns {number|null} Unix timestamp in ms, or null if parsing fails
 */
function parseSteamDate(str) {
  try {
    const clean = str.replace(/(\d+): \+0/, "$1:00 +0000");
    const d = new Date(clean);
    return isNaN(d.getTime()) ? null : d.getTime();
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Price history parsing
// ---------------------------------------------------------------------------

/**
 * Converts a raw Steam price history array into normalized price points.
 *
 * Supports two input formats:
 *   1. Already parsed: [{ t: number, p: number }, ...]
 *      → returned as-is (idempotent, used when reading from cache)
 *   2. Raw Steam format: [["Mar 19 2026 01: +0", 149.104, "77"], ...]
 *      → parsed and normalized
 *
 * @param {Array} raw - Raw or already-parsed price history
 * @returns {{ t: number, p: number }[]} Normalized price points
 */
function parsePriceHistory(raw = []) {
  if (!Array.isArray(raw) || !raw.length) return [];

  // Already parsed — return directly without re-processing
  if (typeof raw[0] === "object" && !Array.isArray(raw[0]) && "t" in raw[0]) {
    return raw.filter(p => p && p.t && !isNaN(p.p));
  }

  // Raw Steam format — parse each row
  return raw
    .map(row => {
      if (!Array.isArray(row) || row.length < 2) return null;

      const dateStr  = row[0];
      const priceRaw = row[1];

      const t = parseSteamDate(dateStr);
      if (!t) return null;

      let p = null;

      // Price as number (standard Steam API response)
      if (typeof priceRaw === "number") {
        p = priceRaw;
      }

      // Price as string — handle EU format (e.g. "1.234,56" or "56,26")
      if (typeof priceRaw === "string") {
        const cleaned = priceRaw.replace(/[^\d.,]/g, "");

        if (cleaned.includes(",") && cleaned.includes(".")) {
          // EU format: thousands separator is ".", decimal is ","
          p = parseFloat(cleaned.replace(/\./g, "").replace(",", "."));
        } else if (cleaned.includes(",")) {
          // Simple comma decimal
          p = parseFloat(cleaned.replace(",", "."));
        } else {
          // Standard dot decimal
          p = parseFloat(cleaned);
        }
      }

      if (p === null || isNaN(p) || p <= 0) return null;

      return { t, p };
    })
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// Last sale
// ---------------------------------------------------------------------------

/**
 * Returns the most recent sale price and timestamp from a parsed history.
 *
 * @param {{ t: number, p: number }[]} history - Parsed price history
 * @returns {{ lastSalePrice: number|null, lastSaleTs: number|null }}
 */
function getLastSale(history = []) {
  if (!history.length) return { lastSalePrice: null, lastSaleTs: null };
  const last = history[history.length - 1];
  return {
    lastSalePrice: last.p,
    lastSaleTs:    last.t
  };
}

module.exports = { parsePriceHistory, getLastSale };