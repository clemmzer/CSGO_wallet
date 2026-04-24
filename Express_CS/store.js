/**
 * In-memory shared store.
 * No external dependencies — used to avoid circular imports.
 *
 * portfolios: { [steamId]: Skin[] }
 * history:    { [skinName]: PricePoint[] }
 * historyCache: reserved for future use
 */
const portfolios   = {};
const history      = {};
const historyCache = {};

module.exports = { portfolios, history, historyCache };