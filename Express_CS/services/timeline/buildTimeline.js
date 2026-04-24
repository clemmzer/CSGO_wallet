const { RANGE, RANGE_MS } = require("../../utils/rangeDuringTimes");

function buildTimeline(skins = [], range = RANGE.DURING_30_DAYS) {
  const now = Date.now();

  let minTime = Infinity;
  let maxTime = -Infinity;

  skins.forEach(s => {
    if (!s.history?.length) return;
    const first = s.history[0].t;
    const last  = s.history[s.history.length - 1].t;
    if (first < minTime) minTime = first;
    if (last  > maxTime) maxTime = last;
  });

  if (!isFinite(minTime)) {
    return [{ time: now, valeur: 0 }];
  }

  // ✅ Applique le range via RANGE_MS
  if (range !== RANGE.ALL_TIME && RANGE_MS[range]) {
    minTime = Math.max(minTime, now - RANGE_MS[range]);
  }

  const interval = 5 * 60 * 1000;
  const pivot    = [];
  for (let t = minTime; t <= maxTime; t += interval) {
    pivot.push(t);
  }

  const timeline = pivot.map(t => {
    let sum = 0;
    const point = { time: t };

    skins.forEach(s => {
      const hist = s.history;

      if (!hist?.length) {
        const fallback   = s.marketPrice ?? s.buyPrice ?? 0;
        point[s.name]    = fallback;
        sum             += fallback;
        return;
      }

      let i = 0;
      while (i < hist.length - 1 && hist[i + 1].t < t) i++;

      const a = hist[i];
      const b = hist[i + 1];
      let price = a.p;

      if (b && b.t >= t) {
        price = a.p + (b.p - a.p) * ((t - a.t) / (b.t - a.t));
      }

      sum          += price;
      point[s.name] = parseFloat(price.toFixed(2));
    });

    point.valeur = parseFloat(sum.toFixed(2));
    return point;
  });

  return timeline;
}

module.exports = { buildTimeline };