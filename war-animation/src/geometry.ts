export type Pt = [number, number];

// Сглаживает ломаную сплайном Катмулла-Рома и пересэмплирует её с шагом step px.
export const smoothPath = (points: Pt[], step = 3): Pt[] => {
  const dense: Pt[] = [];
  const n = points.length;
  for (let i = 0; i < n - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(n - 1, i + 2)];
    for (let k = 0; k < 24; k++) {
      const t = k / 24;
      const t2 = t * t;
      const t3 = t2 * t;
      const c = (a: number, b: number, cc: number, d: number) =>
        0.5 *
        (2 * b +
          (-a + cc) * t +
          (2 * a - 5 * b + 4 * cc - d) * t2 +
          (-a + 3 * b - 3 * cc + d) * t3);
      dense.push([c(p0[0], p1[0], p2[0], p3[0]), c(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  dense.push(points[n - 1]);
  return resample(dense, step);
};

export const resample = (pts: Pt[], step: number): Pt[] => {
  const out: Pt[] = [pts[0]];
  let carry = 0;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const seg = Math.hypot(x1 - x0, y1 - y0);
    let s = step - carry;
    while (s <= seg) {
      const t = s / seg;
      out.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]);
      s += step;
    }
    carry = seg - (s - step);
  }
  const last = pts[pts.length - 1];
  const tail = out[out.length - 1];
  if (Math.hypot(last[0] - tail[0], last[1] - tail[1]) > step * 0.3) out.push(last);
  return out;
};

export const normalAt = (pts: Pt[], i: number): Pt => {
  const a = pts[Math.max(0, i - 2)];
  const b = pts[Math.min(pts.length - 1, i + 2)];
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const l = Math.hypot(dx, dy) || 1;
  return [-dy / l, dx / l];
};

export const offsetPath = (pts: Pt[], o: number): Pt[] =>
  pts.map((p, i) => {
    const [nx, ny] = normalAt(pts, i);
    return [p[0] + nx * o, p[1] + ny * o];
  });

// Точка на ломаной по дробному индексу.
export const pointAt = (pts: Pt[], idx: number): Pt => {
  const i = Math.max(0, Math.min(pts.length - 1, idx));
  const i0 = Math.floor(i);
  const i1 = Math.min(pts.length - 1, i0 + 1);
  const t = i - i0;
  return [
    pts[i0][0] + (pts[i1][0] - pts[i0][0]) * t,
    pts[i0][1] + (pts[i1][1] - pts[i0][1]) * t,
  ];
};

export const slicePath = (pts: Pt[], from: number, to: number): Pt[] => {
  if (to <= from) return [];
  const out: Pt[] = [pointAt(pts, from)];
  for (let i = Math.ceil(from + 1e-6); i < to; i++) out.push(pts[i]);
  out.push(pointAt(pts, to));
  return out;
};

export const polylineD = (pts: Pt[]) =>
  pts.length < 2
    ? ''
    : 'M' + pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('L');

type ArrowStyle = {tailW: number; bodyW: number; headW: number; headL: number};

// Контур «штабной» стрелки вдоль ломаной: сужающееся тело + наконечник.
export const arrowD = (pts: Pt[], style: ArrowStyle): string => {
  if (pts.length < 3) return '';
  const cum = [0];
  for (let i = 1; i < pts.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  }
  const L = cum[cum.length - 1];
  if (L < 6) return '';
  const k = Math.min(1, L / (style.headL * 2.2));
  const headL = style.headL * k;
  const headW = style.headW * Math.max(0.45, k);
  const bodyEnd = L - headL;

  const left: Pt[] = [];
  const right: Pt[] = [];
  let baseIdx = 0;
  for (let i = 0; i < pts.length; i++) {
    if (cum[i] > bodyEnd) break;
    baseIdx = i;
    const t = bodyEnd > 0 ? cum[i] / bodyEnd : 1;
    const w = (style.tailW + (style.bodyW - style.tailW) * t) * Math.max(0.5, k) * 0.5;
    const [nx, ny] = normalAt(pts, i);
    left.push([pts[i][0] + nx * w, pts[i][1] + ny * w]);
    right.push([pts[i][0] - nx * w, pts[i][1] - ny * w]);
  }
  const base = pts[baseIdx];
  const tip = pts[pts.length - 1];
  const dx = tip[0] - base[0];
  const dy = tip[1] - base[1];
  const dl = Math.hypot(dx, dy) || 1;
  const hn: Pt = [-dy / dl, dx / dl];
  const hw = headW * 0.5;
  const hl: Pt = [base[0] + hn[0] * hw, base[1] + hn[1] * hw];
  const hr: Pt = [base[0] - hn[0] * hw, base[1] - hn[1] * hw];
  const poly = [...left, hl, tip, hr, ...right.reverse()];
  return polylineD(poly) + 'Z';
};

// Детерминированный ГПСЧ (mulberry32), чтобы каждый кадр рендерился одинаково.
export const rng = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
