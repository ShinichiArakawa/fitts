const Analysis = {
  linearRegression(points) {
    const n = points.length;
    if (n < 2) return { a: 0, b: 0, r2: 0 };
    let sx = 0, sy = 0, sxx = 0, sxy = 0, syy = 0;
    for (const { x, y } of points) {
      sx += x; sy += y;
      sxx += x * x; sxy += x * y; syy += y * y;
    }
    const denom = n * sxx - sx * sx;
    if (denom === 0) return { a: 0, b: 0, r2: 0 };
    const b = (n * sxy - sx * sy) / denom;
    const a = (sy - b * sx) / n;
    const yMean = sy / n;
    let ssTot = 0, ssRes = 0;
    for (const { x, y } of points) {
      ssTot += (y - yMean) ** 2;
      ssRes += (y - (a + b * x)) ** 2;
    }
    const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;
    return { a, b, r2 };
  },

  summarize(results) {
    const byCondition = new Map();
    for (const r of results) {
      const key = `${r.d}-${r.w}`;
      if (!byCondition.has(key)) {
        byCondition.set(key, { d: r.d, w: r.w, id: r.id, mts: [], hits: 0, total: 0 });
      }
      const c = byCondition.get(key);
      c.mts.push(r.mt);
      if (r.hit) c.hits++;
      c.total++;
    }

    const conditions = [];
    for (const c of byCondition.values()) {
      const mean = c.mts.reduce((a, b) => a + b, 0) / c.mts.length;
      const variance = c.mts.reduce((a, b) => a + (b - mean) ** 2, 0) / c.mts.length;
      conditions.push({
        d: c.d,
        w: c.w,
        id: c.id,
        meanMT: mean,
        sd: Math.sqrt(variance),
        errorRate: 1 - c.hits / c.total,
        n: c.total,
      });
    }
    conditions.sort((a, b) => a.id - b.id);

    const points = conditions.map(c => ({ x: c.id, y: c.meanMT }));
    const reg = this.linearRegression(points);

    const allMTs = results.map(r => r.mt);
    const avgMT = allMTs.reduce((a, b) => a + b, 0) / allMTs.length;
    const totalErrors = results.filter(r => !r.hit).length;
    const errorRate = totalErrors / results.length;

    return { conditions, regression: reg, avgMT, errorRate, allPoints: results.map(r => ({ x: r.id, y: r.mt })) };
  },

  toCSV(results) {
    const header = 'trial,distance_px,width_px,ID_bits,MT_ms,hit\n';
    const rows = results.map((r, i) =>
      `${i + 1},${r.d},${r.w},${r.id.toFixed(3)},${r.mt.toFixed(1)},${r.hit ? 1 : 0}`
    ).join('\n');
    return header + rows;
  }
};
