/**
 * Portfolio metrics builder.
 *
 * Aggregates a list of normalized Skin objects into portfolio-level
 * financial metrics: total invested, current market value, and P&L.
 */

/**
 * Computes portfolio metrics from a list of skins.
 *
 * Market value resolution per skin:
 *   lowestListingPrice > lastSalePrice > buyPrice > buy
 *
 * @param {Object[]} skins - Array of normalized Skin objects
 * @returns {{
 *   totalBuy:         number,
 *   marketValue:      number,
 *   unrealizedPnL:    number,
 *   unrealizedPnLPct: number
 * }}
 */
function buildPortfolio(skins) {
  if (!skins?.length) {
    return {
      totalBuy:         0,
      marketValue:      0,
      unrealizedPnL:    0,
      unrealizedPnLPct: 0
    };
  }

  // Sum of purchase prices — accepts both buyPrice and buy field names
  const totalBuy = skins.reduce(
    (sum, s) => sum + (s.buyPrice ?? s.buy ?? 0),
    0
  );

  // Sum of current market values with fallback chain
  const marketValue = skins.reduce((sum, s) => {
    const ref = s.lowestListingPrice ?? s.lastSalePrice ?? s.buyPrice ?? s.buy ?? 0;
    return sum + ref;
  }, 0);

  const unrealizedPnL    = marketValue - totalBuy;
  const unrealizedPnLPct = totalBuy > 0
    ? (unrealizedPnL / totalBuy) * 100
    : 0;

  return {
    totalBuy,
    marketValue,
    unrealizedPnL,
    unrealizedPnLPct
  };
}

module.exports = { buildPortfolio };