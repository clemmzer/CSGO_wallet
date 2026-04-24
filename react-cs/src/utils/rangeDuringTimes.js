export const RANGE = Object.freeze({
  DURING_1_HOUR:   "1h",
  DURING_24_HOURS: "24h",
  DURING_7_DAYS:   "7d",
  DURING_30_DAYS:  "30d",
  DURING_1_YEAR:   "1y",
  ALL_TIME:        "all"
});

export const RANGE_LABELS = Object.freeze({
  [RANGE.DURING_1_HOUR]:   "1H",
  [RANGE.DURING_24_HOURS]: "24H",
  [RANGE.DURING_7_DAYS]:   "7J",
  [RANGE.DURING_30_DAYS]:  "30J",
  [RANGE.DURING_1_YEAR]:   "1A",
  [RANGE.ALL_TIME]:        "MAX"
});

export const RANGE_MS = Object.freeze({
  [RANGE.DURING_1_HOUR]:   1   * 60 * 60 * 1000,
  [RANGE.DURING_24_HOURS]: 24  * 60 * 60 * 1000,
  [RANGE.DURING_7_DAYS]:   7   * 24 * 60 * 60 * 1000,
  [RANGE.DURING_30_DAYS]:  30  * 24 * 60 * 60 * 1000,
  [RANGE.DURING_1_YEAR]:   365 * 24 * 60 * 60 * 1000,
  [RANGE.ALL_TIME]:        null
});

export const RANGE_LIST = [
  RANGE.DURING_1_HOUR,
  RANGE.DURING_24_HOURS,
  RANGE.DURING_7_DAYS,
  RANGE.DURING_30_DAYS,
  RANGE.DURING_1_YEAR,
  RANGE.ALL_TIME
];