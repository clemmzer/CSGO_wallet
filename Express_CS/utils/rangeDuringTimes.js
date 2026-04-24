/**
 * Enum of available time ranges for charts and timeline filtering.
 * Use these constants instead of raw strings to avoid typos and
 * make refactoring easier.
 *
 * Usage:
 *   const { RANGE } = require("../utils/rangeDuringTimes");
 *   if (range === RANGE.DURING_7_DAYS) { ... }
 */
const RANGE = Object.freeze({
  DURING_1_HOUR:   "1h",
  DURING_24_HOURS: "24h",
  DURING_7_DAYS:   "7d",
  DURING_30_DAYS:  "30d",
  DURING_1_YEAR:   "1y",
  ALL_TIME:        "all"
});

/**
 * Duration in milliseconds for each range.
 * ALL_TIME is null — no lower bound is applied.
 *
 * Usage:
 *   const cutoff = Date.now() - RANGE_MS[range];
 */
const RANGE_MS = Object.freeze({
  [RANGE.DURING_1_HOUR]:   1   * 60 * 60 * 1000,
  [RANGE.DURING_24_HOURS]: 24  * 60 * 60 * 1000,
  [RANGE.DURING_7_DAYS]:   7   * 24 * 60 * 60 * 1000,
  [RANGE.DURING_30_DAYS]:  30  * 24 * 60 * 60 * 1000,
  [RANGE.DURING_1_YEAR]:   365 * 24 * 60 * 60 * 1000,
  [RANGE.ALL_TIME]:        null
});

module.exports = { RANGE, RANGE_MS };