// Движок второго ролика. Не зависит от браузера: его же использует
// scripts/sound.ts, чтобы звуки совпадали с событиями на карте кадр в кадр.
import {type Pt, pointAt, rng, smoothPath} from '../geometry';
import {
  BLUE as BLUE_RGB,
  COAST,
  MAP_H,
  MAP_W,
  N,
  RED as RED_RGB,
  type RGB,
  SEA,
  classify,
  coastField,
  components,
  dijkstra,
  fbm,
  hash2,
  mix,
  pack,
  scale,
  vnoise,
} from '../lib/terrain';
import {ARMIES, type ArmyPlan, BLUE, CAMERA, DURATION, GREEN, OPS, type OpPlan, RED} from './scenario';

export {MAP_H, MAP_W};

const GREEN_RGB: RGB = [30, 122, 58];
export const FACTION_RGB: Record<number, RGB> = {[RED]: RED_RGB, [BLUE]: BLUE_RGB, [GREEN]: GREEN_RGB};
export const GLOW_RGB: Record<number, RGB> = {
  [RED]: [255, 176, 96],
  [BLUE]: [150, 214, 255],
  [GREEN]: [196, 255, 150],
};

const MAXE = 6; // сколько раз пиксель может сменить хозяина
const NEVER = 65535;

export type Gated = {pts: Pt[]; pm: Float32Array};

export type OpRuntime = {
  plan: OpPlan;
  index: number;
  sides: number[];
  thr: Float32Array; // порог «времени захвата» по кадрам (-1 — операция не началась)
  arrows: Gated[];
};

export type Leg = {op: OpRuntime; arrow: Gated; first: number};

export type Army = {
  plan: ArmyPlan;
  legs: Leg[];
  offsets: Pt[];
  death: number;
  seed: number;
};

export type Burst = {x: number; y: number; frame: number; size: number};

export type War = {
  kind: Uint8Array; // исходные владельцы (0 — море)
  evN: Uint8Array;
  evF: Uint16Array;
  evS: Uint8Array;
  base: Uint32Array; // цвет моря
  cols: Uint32Array[]; // цвет суши для каждой стороны
  ops: OpRuntime[];
  armies: Army[];
  bursts: Burst[];
  uprisings: {at: Pt; frame: number}[];
  activity: Float32Array; // сколько пикселей захвачено в каждый кадр
};

// ---------- мелкие утилиты ----------
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const smoothstep = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const easeInOut = (u: number) => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);
const easeOut = (u: number) => 1 - (1 - u) * (1 - u);

export const cameraAt = (frame: number) => {
  const f = Math.max(0, Math.min(DURATION, frame));
  let i = 0;
  while (i < CAMERA.length - 2 && CAMERA[i + 1][0] <= f) i++;
  const a = CAMERA[i];
  const b = CAMERA[i + 1];
  const t = clamp01((f - a[0]) / (b[0] - a[0]));
  const e = 0.5 - 0.5 * Math.cos(Math.PI * t);
  return {zoom: a[1] + (b[1] - a[1]) * e, cx: a[2] + (b[2] - a[2]) * e, cy: a[3] + (b[3] - a[3]) * e};
};

const idxOf = (x: number, y: number) => {
  const xi = Math.max(0, Math.min(MAP_W - 1, Math.round(x)));
  const yi = Math.max(0, Math.min(MAP_H - 1, Math.round(y)));
  return yi * MAP_W + xi;
};

// Расстояние со знаком до многоугольника (минус — внутри).
const polyDist = (poly: Pt[], x: number, y: number) => {
  let inside = false;
  let best = Infinity;
  for (let a = 0, b = poly.length - 1; a < poly.length; b = a++) {
    const [x1, y1] = poly[a];
    const [x2, y2] = poly[b];
    if (y1 > y !== y2 > y && x < ((x2 - x1) * (y - y1)) / (y2 - y1) + x1) inside = !inside;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const t = clamp01(((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy || 1));
    const d = Math.hypot(x - (x1 + dx * t), y - (y1 + dy * t));
    if (d < best) best = d;
  }
  return inside ? -best : best;
};

// ---------- сборка ----------
export const buildWar = (px: ArrayLike<number>, channels: number): War => {
  const {kind} = classify(px, channels);
  const coast = coastField(kind);

  // Базовая «проходимость» суши: шум даёт рваные линии фронта.
  const baseSpeed = new Float32Array(N);
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const i = y * MAP_W + x;
      if (!kind[i]) continue;
      const n = fbm(x / 85, y / 85, 6, 7);
      const fine = vnoise(x / 7, y / 7, 99);
      const t = clamp01((n - 0.3) / 0.4);
      baseSpeed[i] = 0.14 + 2.1 * t * t * (3 - 2 * t) + 0.22 * fine;
    }
  }

  // Цвета: море с сеткой и виньеткой, суша каждой стороны с текстурой и берегом.
  const base = new Uint32Array(N);
  const cols = [0, 1, 2, 3].map(() => new Uint32Array(N));
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const i = y * MAP_W + x;
      if (!kind[i]) {
        const vx = (x - MAP_W / 2) / MAP_W;
        const vy = (y - MAP_H / 2) / MAP_H;
        const vig = 1 - 0.35 * Math.min(1, (vx * vx + vy * vy) * 2.2);
        let c = scale(SEA, vig * (0.96 + 0.08 * fbm(x / 160, y / 160, 3, 3)));
        if (x % 64 === 0 || y % 64 === 0) c = mix(c, [70, 90, 120], 0.18);
        base[i] = pack(mix(c, COAST, coast[i]));
        continue;
      }
      const tex = 0.94 + 0.1 * fbm(x / 40, y / 40, 4, 11) + 0.03 * (hash2(x, y, 5) - 0.5);
      for (const f of [RED, BLUE, GREEN]) cols[f][i] = pack(mix(scale(FACTION_RGB[f], tex), COAST, coast[i]));
    }
  }

  // События смены владельца: для пикселя i — кадры evF и новые хозяева evS по порядку.
  const evN = new Uint8Array(N);
  const evF = new Uint16Array(N * MAXE).fill(NEVER);
  const evS = new Uint8Array(N * MAXE);
  const ownerAt = (i: number, f: number) => {
    let o = kind[i];
    const n = evN[i];
    for (let e = 0; e < n; e++) {
      if (evF[i * MAXE + e] > f) break;
      o = evS[i * MAXE + e];
    }
    return o;
  };
  const pendingAfter = (i: number, f: number) => evN[i] > 0 && evF[i * MAXE + evN[i] - 1] > f;

  const activity = new Float32Array(DURATION + 1);
  const bursts: Burst[] = [];
  const uprisings: {at: Pt; frame: number}[] = [];
  const corr = new Float32Array(N);
  const speed = new Float32Array(N);

  // Окружённые котлы (островки чужой земли, со всех сторон зажатые другими) после
  // операции быстро сдаются тому, кто окружает их больше всех.
  const capturePockets = (targets: number[], f0: number) => {
    const mask = new Uint8Array(N);
    const ownNow = new Uint8Array(N);
    for (let i = 0; i < N; i++) {
      if (!kind[i]) continue;
      ownNow[i] = ownerAt(i, f0);
      if (targets.includes(ownNow[i]) && !pendingAfter(i, f0)) mask[i] = 1;
    }
    const {label, areas} = components(mask, 1);
    const touch = areas.map(() => [0, 0, 0, 0]);
    for (let i = 0; i < N; i++) {
      const c = label[i];
      if (!mask[i] || c < 0) continue;
      const x = i % MAP_W;
      for (const j of [x > 0 ? i - 1 : -1, x < MAP_W - 1 ? i + 1 : -1, i - MAP_W, i + MAP_W]) {
        if (j < 0 || j >= N || !kind[j] || label[j] === c) continue;
        touch[c][ownNow[j]]++;
      }
    }
    const winner = touch.map((t, c) => {
      if (areas[c] > 12000 || targets.some((tg) => t[tg] > 0)) return 0;
      let best = 0;
      for (let f = 1; f <= 3; f++) if (t[f] > (best ? t[best] : 0)) best = f;
      return best;
    });
    // Котёл сжимается от краёв к центру.
    const depth = new Int32Array(N).fill(-1);
    const queue = new Int32Array(N);
    let qh = 0;
    let qt = 0;
    for (let i = 0; i < N; i++) {
      if (!mask[i] || !winner[label[i]]) continue;
      const x = i % MAP_W;
      for (const j of [x > 0 ? i - 1 : -1, x < MAP_W - 1 ? i + 1 : -1, i - MAP_W, i + MAP_W]) {
        if (j >= 0 && j < N && kind[j] && label[j] !== label[i]) {
          depth[i] = 0;
          queue[qt++] = i;
          break;
        }
      }
    }
    while (qh < qt) {
      const i = queue[qh++];
      const x = i % MAP_W;
      for (const j of [x > 0 ? i - 1 : -1, x < MAP_W - 1 ? i + 1 : -1, i - MAP_W, i + MAP_W]) {
        if (j < 0 || j >= N || depth[j] >= 0 || !mask[j] || label[j] !== label[i]) continue;
        depth[j] = depth[i] + 1;
        queue[qt++] = j;
      }
    }
    for (let i = 0; i < N; i++) {
      if (!mask[i] || !winner[label[i]] || evN[i] >= MAXE) continue;
      const f = Math.min(DURATION, f0 + 6 + Math.round(Math.min(45, Math.max(0, depth[i]) * 0.7)));
      const e = evN[i]++;
      evF[i * MAXE + e] = f;
      evS[i * MAXE + e] = winner[label[i]];
      activity[f]++;
    }
  };

  const plans = OPS.map((p, index) => ({p, index})).sort((a, b) => a.p.start - b.p.start || a.index - b.index);
  const ops: OpRuntime[] = [];

  for (const {p: plan, index} of plans) {
    const sides = Array.isArray(plan.side) ? plan.side : [plan.side];
    const soft = plan.soft ?? 28;
    const xs = plan.mask.map((q) => q[0]);
    const ys = plan.mask.map((q) => q[1]);
    const bx0 = Math.max(0, Math.floor(Math.min(...xs) - soft));
    const bx1 = Math.min(MAP_W - 1, Math.ceil(Math.max(...xs) + soft));
    const by0 = Math.max(0, Math.floor(Math.min(...ys) - soft));
    const by1 = Math.min(MAP_H - 1, Math.ceil(Math.max(...ys) + soft));

    // 1. Район операции: чужая земля внутри маски (+ море для десантов).
    const domain = new Uint8Array(N);
    const eligible: number[] = [];
    for (let y = by0; y <= by1; y++) {
      for (let x = bx0; x <= bx1; x++) {
        const i = y * MAP_W + x;
        if (!kind[i] && !plan.naval) continue;
        const sd = polyDist(plan.mask, x, y);
        if (sd > soft) continue;
        if (sd > -soft && sd + (fbm(x / 70, y / 70, 3, 50 + index) - 0.5) * 2 * soft >= 0) continue;
        if (!kind[i]) {
          domain[i] = 1;
          continue;
        }
        if (!plan.targets.includes(ownerAt(i, plan.start)) || pendingAfter(i, plan.start)) continue;
        domain[i] = 1;
        eligible.push(i);
      }
    }

    // 2. Скорость: шум + коридоры вдоль стрелок.
    const arrowPaths = (plan.arrows ?? []).map((a) => smoothPath(a, 3));
    const boost = plan.boost ?? 2.2;
    const sigma = 40;
    const R = 110;
    for (let y = by0; y <= by1; y++) corr.fill(0, y * MAP_W + bx0, y * MAP_W + bx1 + 1);
    for (const pts of arrowPaths) {
      for (let s = 0; s < pts.length; s += 2) {
        const [cx, cy] = pts[s];
        for (let y = Math.max(by0, Math.floor(cy - R)); y <= Math.min(by1, Math.ceil(cy + R)); y++) {
          for (let x = Math.max(bx0, Math.floor(cx - R)); x <= Math.min(bx1, Math.ceil(cx + R)); x++) {
            const d2 = (x - cx) * (x - cx) + (y - cy) * (y - cy);
            if (d2 > R * R) continue;
            const v = boost * Math.exp(-d2 / (2 * sigma * sigma));
            const i = y * MAP_W + x;
            if (v > corr[i]) corr[i] = v;
          }
        }
      }
    }
    for (let y = Math.max(0, by0 - 2); y <= Math.min(MAP_H - 1, by1 + 2); y++) {
      for (let x = Math.max(0, bx0 - 2); x <= Math.min(MAP_W - 1, bx1 + 2); x++) {
        const i = y * MAP_W + x;
        speed[i] = kind[i]
          ? baseSpeed[i] * (0.7 + 0.6 * vnoise(x / 45, y / 45, 31 + index * 7)) * (1 + (domain[i] ? corr[i] : 0))
          : 0.45;
      }
    }

    // 3. Дейкстра от земли наступающей стороны (или от точки восстания).
    const dist = new Float32Array(N).fill(Infinity);
    const who = new Uint8Array(N);
    for (const side of sides) {
      const init = new Float32Array(N).fill(Infinity);
      if (plan.seed) {
        const [sx, sy] = plan.seed;
        for (let y = Math.round(sy) - 8; y <= Math.round(sy) + 8; y++)
          for (let x = Math.round(sx) - 8; x <= Math.round(sx) + 8; x++) {
            const i = idxOf(x, y);
            if (domain[i] && kind[i] && (x - sx) ** 2 + (y - sy) ** 2 <= 64) init[i] = 0;
          }
      } else {
        for (let y = Math.max(1, by0 - 2); y <= Math.min(MAP_H - 2, by1 + 2); y++) {
          for (let x = Math.max(1, bx0 - 2); x <= Math.min(MAP_W - 2, bx1 + 2); x++) {
            const i = y * MAP_W + x;
            if (!kind[i] || domain[i] || ownerAt(i, plan.start) !== side) continue;
            if (domain[i - 1] || domain[i + 1] || domain[i - MAP_W] || domain[i + MAP_W]) init[i] = 0;
          }
        }
      }
      const d = dijkstra(speed, init, domain);
      for (const i of eligible) {
        if (d[i] < dist[i]) {
          dist[i] = d[i];
          who[i] = side;
        }
      }
      if (sides.length === 1) {
        // для стрелок нужны значения и в море
        for (let i = 0; i < N; i++) if (domain[i] && !kind[i]) dist[i] = d[i];
      }
    }

    // 4. Порог захвата по кадрам.
    const reach = eligible.filter((i) => dist[i] < Infinity);
    const D = Float32Array.from(reach.map((i) => dist[i])).sort();
    const share = plan.share ?? 1;
    const thrEnd = D.length ? D[Math.floor(share * (D.length - 1))] : -1;
    const thr = new Float32Array(DURATION + 1);
    for (let f = 0; f <= DURATION; f++) {
      if (f < plan.start || !D.length) thr[f] = -1;
      else if (f >= plan.end) thr[f] = thrEnd;
      else {
        const u = (f - plan.start) / (plan.end - plan.start);
        thr[f] =
          (plan.mode ?? 'area') === 'area'
            ? D[Math.floor(share * easeInOut(u) * (D.length - 1))]
            : thrEnd * easeOut(u);
      }
    }
    const frameOf = (d: number) => {
      let lo = plan.start;
      let hi = Math.min(DURATION, plan.end);
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (thr[mid] >= d) hi = mid;
        else lo = mid + 1;
      }
      return lo;
    };

    // 5. Записываем события захвата.
    const rand = rng(900 + index);
    const captured: number[] = [];
    for (const i of reach) {
      if (dist[i] > thrEnd || evN[i] >= MAXE) continue;
      const f = frameOf(dist[i]);
      const e = evN[i]++;
      evF[i * MAXE + e] = f;
      evS[i * MAXE + e] = who[i];
      activity[f]++;
      captured.push(i);
    }
    capturePockets(plan.targets, plan.end);
    const nb = Math.max(10, Math.min(90, Math.round(captured.length / 2000)));
    for (let b = 0; b < nb && captured.length; b++) {
      const i = captured[Math.floor(rand() * captured.length)];
      bursts.push({x: i % MAP_W, y: Math.floor(i / MAP_W), frame: frameOf(dist[i]), size: 5 + rand() * 9});
    }
    if (plan.seed) uprisings.push({at: plan.seed, frame: plan.start});

    // 6. Стрелки, «привязанные» к фронту этой операции.
    const arrows = arrowPaths.map((pts) => {
      const pm = new Float32Array(pts.length);
      let m = 0;
      for (let s = 0; s < pts.length; s++) {
        const i = idxOf(pts[s][0], pts[s][1]);
        const v = domain[i] ? dist[i] : sides.includes(ownerAt(i, plan.start)) ? 0 : Infinity;
        m = Math.max(m, v);
        pm[s] = m;
      }
      return {pts, pm};
    });

    ops[index] = {plan, index, sides, thr, arrows};
  }

  const opById = new Map(ops.map((o) => [o.plan.id, o]));

  // Армии: точки + численность, умирают, когда их позицию занимает враг.
  const armies: Army[] = ARMIES.map((plan, a) => {
    const rand = rng(5000 + a * 17);
    const offsets: Pt[] = [[0, 0]];
    let tries = 0;
    while (offsets.length < 9 && tries++ < 2000) {
      const ang = rand() * Math.PI * 2;
      const r = 8 + rand() * 16;
      const p: Pt = [Math.cos(ang) * r, Math.sin(ang) * r * 0.85];
      if (offsets.every((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) > 10)) offsets.push(p);
    }
    offsets.sort((u, v) => Math.hypot(u[0], u[1]) - Math.hypot(v[0], v[1]));
    const legs: Leg[] = (plan.legs ?? []).map((l) => {
      const op = opById.get(l.op)!;
      const arrow = op.arrows[l.arrow];
      let first = op.plan.start;
      while (first < DURATION && frontIndex(arrow, op.thr[first]) < 0) first++;
      return {op, arrow, first};
    });
    return {plan, legs, offsets, death: Infinity, seed: a * 101 + 7};
  });

  const war: War = {kind, evN, evF, evS, base, cols, ops, armies, bursts, uprisings, activity};

  for (const army of armies) {
    for (let f = army.plan.spawn + 3; f <= DURATION; f++) {
      const [x, y] = armyCenter(war, army, f);
      const i = idxOf(x, y);
      if (!kind[i]) continue;
      if (ownerAt(i, f) !== army.plan.side) {
        army.death = f;
        break;
      }
    }
  }
  return war;
};

// ---------- запросы по кадру ----------
export const ownerOf = (w: War, i: number, f: number) => {
  let o = w.kind[i];
  for (let e = 0; e < w.evN[i]; e++) {
    if (w.evF[i * MAXE + e] > f) break;
    o = w.evS[i * MAXE + e];
  }
  return o;
};

export const MAX_EVENTS = MAXE;

// Самая дальняя точка пути, до которой дошёл фронт (дробный индекс), или -1.
export const frontIndex = (g: Gated, th: number): number => {
  const pm = g.pm;
  const n = pm.length;
  if (th < 0 || pm[0] > th) return -1;
  if (pm[n - 1] <= th) return n - 1;
  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (pm[mid] <= th) lo = mid;
    else hi = mid;
  }
  const span = pm[lo + 1] - pm[lo];
  return span > 0 && Number.isFinite(span) ? lo + (th - pm[lo]) / span : lo;
};

export const smoothFront = (op: OpRuntime, g: Gated, frame: number, window = 10) => {
  let sum = 0;
  for (let k = 0; k < window; k++) {
    const f = Math.max(0, Math.min(DURATION, Math.floor(frame) - k));
    sum += Math.max(0, frontIndex(g, op.thr[f]));
  }
  return sum / window;
};

export const armyCenter = (_w: War, army: Army, frame: number): Pt => {
  const {plan} = army;
  let p: Pt = plan.at;
  if (plan.from) {
    const t = clamp01((frame - plan.spawn) / 50);
    const e = t * t * (3 - 2 * t);
    p = [plan.from[0] + (plan.at[0] - plan.from[0]) * e, plan.from[1] + (plan.at[1] - plan.from[1]) * e];
  }
  for (const leg of army.legs) {
    if (frame < leg.first) break;
    const idx = Math.max(0, smoothFront(leg.op, leg.arrow, frame) - 6);
    const g = pointAt(leg.arrow.pts, idx);
    const t = smoothstep(leg.first, leg.first + 30, frame);
    p = [p[0] + (g[0] - p[0]) * t, p[1] + (g[1] - p[1]) * t];
  }
  return p;
};

export const strengthAt = (army: Army, frame: number) => {
  const keys = army.plan.strength;
  const f = Math.min(frame, army.death);
  let v = keys[keys.length - 1][1];
  if (f <= keys[0][0]) v = keys[0][1];
  else
    for (let k = 0; k < keys.length - 1; k++) {
      const [f0, v0] = keys[k];
      const [f1, v1] = keys[k + 1];
      if (f >= f0 && f <= f1) {
        v = v0 + (v1 - v0) * ((f - f0) / (f1 - f0));
        break;
      }
    }
  if (frame > army.death) v *= 1 - clamp01((frame - army.death) / 18);
  return v;
};
