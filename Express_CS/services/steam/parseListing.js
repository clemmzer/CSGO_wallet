/**
 * Steam lowest listing price parser.
 *
 * Steam returns prices as localized strings (e.g. "56,26€", "1.234,56€").
 * This module normalizes them into plain floats.
 */

/**
 * Parses a Steam lowest listing response into a normalized price.
 *
 * Priority: lowest_price > median_price
 * Handles EU number format (comma decimal, dot thousands separator).
 *
 * @param {Object} raw - Raw Steam price overview response
 * @param {string} [raw.lowest_price] - e.g. "56,26€"
 * @param {string} [raw.median_price] - e.g. "57,01€"
 * @returns {{ price: number|null, ts: number|null }}
 */
function parseLowestListing(raw) {
  if (!raw) return { price: null, ts: null };

  const str = raw.lowest_price || raw.median_price;
  if (!str) return { price: null, ts: null };

  // Remove currency symbols and whitespace, normalize decimal separator
  const cleaned = str
    .replace(/[^\d.,]/g, "") // keep digits, dots, commas
    .replace(/\./g, "")      // remove thousands separator
    .replace(",", ".");       // normalize decimal separator

  const price = parseFloat(cleaned);

  return {
    price: isNaN(price) ? null : price,
    ts:    Date.now()
  };
}

module.exports = { parseLowestListing };