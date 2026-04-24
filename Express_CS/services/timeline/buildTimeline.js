/**
 * Portfolio timeline builder.
 *
 * Generates a time-series of aggregated portfolio values
 * by interpolating each skin's price history at regular intervals.
 *
 * Output format:
 *   [{ time: number, valeur: number, "Skin Name": number, ... }, ...]
 *
 * Each point includes the individual skin price under its name key,
 * allowing per-skin chart rendering on the frontend.
 */

const { RANGE, RANGE_MS } = require("../../utils/rangeDuringTimes");

/**
 * Builds a time-series timeline for a list of skins over a given range.
 *
 * Steps:
 *   1. Find the global min/max timestamp across all skin histories
 *   2. Apply range filter to set the lower time bound
 *   3. Generate pivot timestamps at 5-minute intervals
 *   4. For each pivot, interpolate each skin's price and sum them
 *
 * Skins with no history use their marketPrice as a flat constant.
 *
 * @param {Object[]} skins - Array of normalized Skin objects
 * @param {string}   range - Time range key (from RANGE enum)
 * @returns {Object[]} Array of timeline data points
 */
function buildTimeline(skins = [], range = RANGE.DURING_30_DAYS) {
  const now = Date.now();

  // --- Step 1: Find global time bounds across all histories ---
  let minTime = Infinity;
  let maxTime = -Infinity;

  skins.forEach(s => {
    if (!s.history?.length) return;
    const first = s.history[0].t;
    const last  = s.history[s.history.length - 1].t;
    if (first < minTime) minTime = first;
    if (last  > maxTime) maxTime = last;
  });

  // No history data available — return a single empty point
  if (!isFinite(minTime)) {
    return [{ time: now, valeur: 0 }];
  }

  // --- Step 2: Apply range lower bound ---
  if (range !== RANGE.ALL_TIME && RANGE_MS[range]) {
    minTime = Math.max(minTime, now - RANGE_MS[range]);
  }

  // --- Step 3: Generate pivot timestamps at 5-minute intervals ---
  const INTERVAL_MS = 5 * 60 * 1000;
  const pivot = [];
  for (let t = minTime; t <= maxTime; t += INTERVAL_MS) {
    pivot.push(t);
  }

  // --- Step 4: Build timeline points ---
  const timeline = pivot.map(t => {
    let sum = 0;
    const point = { time: t };

    skins.forEach(s => {
      const hist = s.history;

      // No history — use flat market price as constant
      if (!hist?.length) {
        const fallback = s.marketPrice ?? s.buyPrice ?? 0;
        point[s.name]  = fallback;
        sum           += fallback;
        return;
      }

      // Find the last known price point before or at time t
      let i = 0;
      while (i < hist.length - 1 && hist[i + 1].t < t) i++;

      const a = hist[i];
      const b = hist[i + 1];
      let price = a.p;

      // Linear interpolation between the two surrounding points
      if (b && b.t >= t) {
        price = a.p + (b.p - a.p) * ((t - a.t) / (b.t - a.t));
      }

      point[s.name] = parseFloat(price.toFixed(2));
      sum          += price;
    });

    point.valeur = parseFloat(sum.toFixed(2));
    return point;
  });

  return timeline;
}

module.exports = { buildTimeline };