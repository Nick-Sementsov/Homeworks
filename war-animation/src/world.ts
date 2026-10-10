import {staticFile} from 'remotion';
import {
  BLUE,
  COAST,
  MAP_H,
  MAP_W,
  N,
  RED,
  type RGB,
  SEA,
  classify,
  coastField,
  dijkstra,
  fbm,
  hash2,
  mix,
  mixPacked,
  pack,
  scale,
  vnoise,
} from './lib/terrain';
import {type Pt, offsetPath, rng, smoothPath} from './geometry';
import {AXES, COUNTER, LANDINGS, type AxisPlan} from './plan';
import {DURATION, T, progress} from './timeline';

export {MAP_H, MAP_W, mixPacked};

export const GLOW: RGB = [255, 196, 110];
export const EDGE: RGB = [255, 238, 214];

// Путь, вдоль которого продвижение «привязано» к линии фронта:
// pm[i] — максимальное «время захвата» на участке пути до точки i.
export type Gated = {pts: Pt[]; pm: Float32Array};

export type RedUnit = {
  path: Gated;
  back: number; // отставание от фронта, в сэмплах пути (шаг 3 px)
  stage: number; // индекс исходной позиции перед наступлением
  appear: number;
  deployEnd: number;
  seed: number;
  axis: number;
  r: number;
};

export type BlueUnit = {
  home: Pt;
  target: Pt;
  dHome: number;
  dTarget: number;
  appear: number;
  death: number;
  seed: number;
  r: number;
};

export type Burst = {x: number; y: number; frame: number; size: number; seed: number};

export type AxisData = {
  plan: AxisPlan;
  path: Gated;
  arrowFrom: number;
  idx0: number;
};

export type World = {
  kind: Uint8Array; // 0 — море, 1 — исходно красные, 2 — исходно синие
  rdist: Float32Array; // «время захвата» пикселя (0 у красных, ∞ у моря)
  base: Uint32Array; // цвет моря и исходной красной территории
  blueCol: Uint32Array;
  occCol: Uint32Array; // занятая территория (со штриховкой)
  redCol: Uint32Array; // занятая территория после победы
  maxDist: number;
  thr: Float32Array; // порог захвата по кадрам
  blueSorted: Float32Array;
  redArea: number;
  axes: AxisData[];
  redUnits: RedUnit[];
  blueUnits: BlueUnit[];
  bursts: Burst[];
  landings: Gated[];
  counter: {pts: Pt[]; tipIdx: number; units: {lag: number; o: number; death: number}[]};
};

// ---------- загрузка карты ----------
const loadPixels = async (): Promise<Uint8ClampedArray> => {
  const img = new Image();
  img.src = staticFile('map.png');
  await img.decode();
  const c = document.createElement('canvas');
  c.width = MAP_W;
  c.height = MAP_H;
  const ctx = c.getContext('2d', {willReadFrequently: true})!;
  ctx.drawImage(img, 0, 0, MAP_W, MAP_H);
  return ctx.getImageData(0, 0, MAP_W, MAP_H).data;
};

// ---------- сборка мира ----------
const build = async (): Promise<World> => {
  const px = await loadPixels();
  const {kind, lc} = classify(px, 4);


  // 4. Поле скорости продвижения: шум (рваный фронт) + коридоры главных ударов.
  const axisPaths = AXES.map((a) => smoothPath(a.points, 3));
  const corr = new Float32Array(N);
  {
    const sigma = 42;
    const R = 115;
    for (let a = 0; a < AXES.length; a++) {
      const pts = axisPaths[a];
      const boost = AXES[a].boost;
      const from = Math.floor(AXES[a].arrowFrom / 3);
      for (let s = from; s < pts.length; s += 2) {
        const [cx, cy] = pts[s];
        const x0 = Math.max(0, Math.floor(cx - R));
        const x1 = Math.min(MAP_W - 1, Math.ceil(cx + R));
        const y0 = Math.max(0, Math.floor(cy - R));
        const y1 = Math.min(MAP_H - 1, Math.ceil(cy + R));
        for (let y = y0; y <= y1; y++) {
          const ddy = (y - cy) * (y - cy);
          for (let x = x0; x <= x1; x++) {
            const d2 = (x - cx) * (x - cx) + ddy;
            if (d2 > R * R) continue;
            const v = boost * Math.exp(-d2 / (2 * sigma * sigma));
            const i = y * MAP_W + x;
            if (v > corr[i]) corr[i] = v;
          }
        }
      }
    }
  }
  const speed = new Float32Array(N);
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const i = y * MAP_W + x;
      if (!kind[i]) {
        speed[i] = 0.45;
        continue;
      }
      const n = fbm(x / 85, y / 85, 6, 7);
      const fine = vnoise(x / 7, y / 7, 99);
      const t = Math.min(1, Math.max(0, (n - 0.3) / 0.4));
      speed[i] = (0.14 + 2.1 * t * t * (3 - 2 * t) + 0.22 * fine) * (1 + corr[i]);
    }
  }
  const init = new Float32Array(N).fill(Infinity);
  for (let i = 0; i < N; i++) if (kind[i] === 1) init[i] = 0;
  const dist = dijkstra(speed, init);

  const rdist = new Float32Array(N);
  let maxDist = 0;
  let blueCount = 0;
  let redArea = 0;
  for (let i = 0; i < N; i++) {
    if (kind[i] === 0) rdist[i] = Infinity;
    else if (kind[i] === 1) {
      rdist[i] = 0;
      redArea++;
    } else {
      rdist[i] = dist[i];
      if (dist[i] > maxDist) maxDist = dist[i];
      blueCount++;
    }
  }
  const blueSorted = new Float32Array(blueCount);
  {
    let k = 0;
    for (let i = 0; i < N; i++) if (kind[i] === 2) blueSorted[k++] = dist[i];
    blueSorted.sort();
  }

  // Материк захватывается за первые 85% наступления, острова (через море) — за остаток.
  let mainId = 0;
  for (let c = 1; c < lc.areas.length; c++) if (lc.areas[c] > lc.areas[mainId]) mainId = c;
  // На материке порог берём по квантилю площади — красные занимают землю равномерно во времени.
  const mainDists: number[] = [];
  for (let i = 0; i < N; i++) if (kind[i] === 2 && lc.label[i] === mainId) mainDists.push(dist[i]);
  const mainQ = Float32Array.from(mainDists).sort();
  const mainMax = mainQ[mainQ.length - 1];
  const MAINLAND = 0.85;
  const thr = new Float32Array(DURATION + 1);
  for (let f = 0; f <= DURATION; f++) {
    const p = progress[f];
    if (f >= T.offEnd) thr[f] = maxDist * 1.001 + 1;
    else if (p <= 0) thr[f] = 0;
    else if (p <= MAINLAND) thr[f] = mainQ[Math.min(mainQ.length - 1, Math.floor((p / MAINLAND) * (mainQ.length - 1)))];
    else thr[f] = mainMax + ((p - MAINLAND) / (1 - MAINLAND)) * (maxDist - mainMax);
  }

  const frameWhen = (d: number) => frameWhenThr(thr, d);

  const distAt = (x: number, y: number) => {
    const xi = Math.max(0, Math.min(MAP_W - 1, Math.round(x)));
    const yi = Math.max(0, Math.min(MAP_H - 1, Math.round(y)));
    return dist[yi * MAP_W + xi];
  };
  const isLand = (x: number, y: number) => {
    const xi = Math.round(x);
    const yi = Math.round(y);
    if (xi < 0 || yi < 0 || xi >= MAP_W || yi >= MAP_H) return false;
    return kind[yi * MAP_W + xi] !== 0;
  };

  const gate = (pts: Pt[]): Gated => {
    const pm = new Float32Array(pts.length);
    let m = 0;
    for (let i = 0; i < pts.length; i++) {
      m = Math.max(m, distAt(pts[i][0], pts[i][1]));
      pm[i] = m;
    }
    return {pts, pm};
  };

  // 5. Цвета пикселей: побережье, текстура, штриховка занятых земель, сетка на море.
  const coast = coastField(kind);
  const base = new Uint32Array(N);
  const blueCol = new Uint32Array(N);
  const occCol = new Uint32Array(N);
  const redCol = new Uint32Array(N);
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const i = y * MAP_W + x;
      const k = kind[i];
      if (k === 0) {
        const vx = (x - MAP_W / 2) / MAP_W;
        const vy = (y - MAP_H / 2) / MAP_H;
        const vig = 1 - 0.35 * Math.min(1, (vx * vx + vy * vy) * 2.2);
        let c = scale(SEA, vig * (0.96 + 0.08 * fbm(x / 160, y / 160, 3, 3)));
        if (x % 64 === 0 || y % 64 === 0) c = mix(c, [70, 90, 120], 0.18);
        base[i] = pack(mix(c, COAST, coast[i]));
        continue;
      }
      const tex = 0.94 + 0.1 * fbm(x / 40, y / 40, 4, 11) + 0.03 * (hash2(x, y, 5) - 0.5);
      const e = coast[i];
      const red = mix(scale(RED, tex), COAST, e);
      if (k === 1) {
        base[i] = pack(red);
        continue;
      }
      blueCol[i] = pack(mix(scale(BLUE, tex), COAST, e));
      redCol[i] = pack(red);
      const hatch = ((x - y) & 15) < 3;
      occCol[i] = pack(mix(scale(RED, tex * (hatch ? 0.8 : 1.04)), COAST, e));
    }
  }

  // 6. Армии красных.
  const axes: AxisData[] = AXES.map((plan, a) => {
    const path = gate(axisPaths[a]);
    return {plan, path, arrowFrom: Math.floor(plan.arrowFrom / 3), idx0: frontIndex(path, 0)};
  });

  const redUnits: RedUnit[] = [];
  AXES.forEach((plan, a) => {
    const rand = rng(100 + a * 31);
    const rows = plan.troops === 16 ? [4, 4, 4, 4] : [3, 4, 4, 3];
    let j = 0;
    rows.forEach((count, row) => {
      for (let c = 0; c < count; c++) {
        const lateral = (c - (count - 1) / 2) * 17 + (rand() - 0.5) * 6;
        const backPx = 12 + row * 17 + (rand() - 0.5) * 6;
        // Смещённый путь; если точка уходит в море — прижимаем к оси.
        const raw = axisPaths[a];
        const pts = offsetPath(raw, lateral).map((p, i) => {
          if (isLand(p[0], p[1])) return p;
          const half = offsetPath([raw[Math.max(0, i - 1)], raw[i], raw[Math.min(raw.length - 1, i + 1)]], lateral * 0.4)[1];
          return isLand(half[0], half[1]) ? half : raw[i];
        });
        const path = gate(pts);
        const back = backPx / 3;
        const stage = Math.max(0, frontIndex(path, 0) - back);
        const appear = T.deployStart + a * 10 + j * 3 + Math.floor(rand() * 6);
        redUnits.push({
          path,
          back,
          stage,
          appear,
          deployEnd: T.deployEnd - 5 + Math.floor(rand() * 10),
          seed: a * 100 + j,
          axis: a,
          r: row === 0 && c === Math.floor(count / 2) ? 7 : 5.5,
        });
        j++;
      }
    });
  });

  // 7. Войска синих: плотная линия обороны у фронта + гарнизоны вглубь.
  const blueUnits: BlueUnit[] = [];
  {
    const rand = rng(4242);
    const placed: Pt[] = [];
    const tryPlace = (want: number, maxD: number, minD: number, gap: number) => {
      let tries = 0;
      let got = 0;
      while (got < want && tries < 40000) {
        tries++;
        const x = 600 + rand() * 820;
        const y = 170 + rand() * 820;
        const i = Math.round(y) * MAP_W + Math.round(x);
        if (kind[i] !== 2 || coast[i] > 0) continue;
        const d = dist[i];
        if (d > maxD || d < minD) continue;
        // не ставим у самого берега
        if (!isLand(x + 9, y) || !isLand(x - 9, y) || !isLand(x, y + 9) || !isLand(x, y - 9)) continue;
        if (placed.some((p) => Math.hypot(p[0] - x, p[1] - y) < gap)) continue;
        placed.push([x, y]);
        got++;
      }
    };
    tryPlace(22, maxDist * 0.1, maxDist * 0.02, 34);
    tryPlace(48, maxDist, maxDist * 0.1, 44);
    for (const [x, y] of placed) {
      const g = 7;
      const gx = distAt(x + g, y) - distAt(x - g, y);
      const gy = distAt(x, y + g) - distAt(x, y - g);
      const gl = Math.hypot(gx, gy) || 1;
      let target: Pt = [x + (gx / gl) * 20, y + (gy / gl) * 20];
      if (!isLand(target[0], target[1]) || !Number.isFinite(gl)) target = [x, y];
      const dHome = distAt(x, y);
      const dTarget = Math.max(dHome, distAt(target[0], target[1]));
      blueUnits.push({
        home: [x, y],
        target,
        dHome,
        dTarget,
        appear: T.deployStart + 6 + Math.floor(rand() * 70),
        death: frameWhen(dTarget * 1.002 + 0.5),
        seed: Math.floor(rand() * 1e6),
        r: 5.5,
      });
    }
  }

  // 8. Вспышки боёв вдоль фронта.
  const bursts: Burst[] = [];
  {
    const rand = rng(777);
    let tries = 0;
    while (bursts.length < 340 && tries < 200000) {
      tries++;
      const x = 600 + rand() * 820;
      const y = 170 + rand() * 820;
      const i = Math.round(y) * MAP_W + Math.round(x);
      if (kind[i] !== 2) continue;
      bursts.push({x, y, frame: frameWhen(dist[i]), size: 5 + rand() * 9, seed: Math.floor(rand() * 1e6)});
    }
  }

  // 9. Десанты и контрудар.
  const landings = LANDINGS.map((p) => gate(smoothPath(p, 3)));

  const counterPts = smoothPath(COUNTER, 3);
  let tipIdx = counterPts.length - 1;
  for (let i = 0; i < counterPts.length; i++) {
    const [x, y] = counterPts[i];
    if (frameWhen(distAt(x, y)) <= T.counterRepelled + 4) {
      tipIdx = i;
      break;
    }
  }
  const counter = {
    pts: counterPts,
    tipIdx,
    units: [0, 1, 2, 3, 4].map((k) => ({
      lag: 10 + (k % 3) * 9,
      o: (k - 2) * 11,
      death: T.counterRepelled + 2 + k * 4,
    })),
  };

  return {
    kind,
    rdist,
    base,
    blueCol,
    occCol,
    redCol,
    maxDist,
    thr,
    blueSorted,
    redArea,
    axes,
    redUnits,
    blueUnits,
    bursts,
    landings,
    counter,
  };
};

// Первый кадр, к которому фронт доходит до «времени захвата» d.
const frameWhenThr = (thr: Float32Array, d: number) => {
  if (d <= 0) return 0;
  if (thr[DURATION] < d) return Infinity;
  let lo = 0;
  let hi = DURATION;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (thr[mid] >= d) hi = mid;
    else lo = mid + 1;
  }
  return lo;
};

export const frameWhen = (w: World, d: number) => frameWhenThr(w.thr, d);

// Самая дальняя точка пути, до которой фронт уже дошёл (дробный индекс), или -1.
export const frontIndex = (g: Gated, th: number): number => {
  const pm = g.pm;
  const n = pm.length;
  if (pm[0] > th) return -1;
  if (pm[n - 1] <= th) return n - 1;
  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (pm[mid] <= th) lo = mid;
    else hi = mid;
  }
  return lo + (th - pm[lo]) / (pm[lo + 1] - pm[lo]);
};

// То же, но сглаженное по нескольким предыдущим кадрам — без рывков.
export const smoothFront = (w: World, g: Gated, frame: number, lead = 0, window = 10) => {
  let sum = 0;
  let cnt = 0;
  for (let k = 0; k < window; k++) {
    const f = Math.max(0, Math.min(DURATION, Math.floor(frame) - k));
    const idx = frontIndex(g, w.thr[f] + lead);
    sum += idx;
    cnt++;
  }
  return sum / cnt;
};

export const thrAt = (w: World, frame: number) =>
  w.thr[Math.max(0, Math.min(DURATION, Math.floor(frame)))];

// Доля исходно синей территории, уже занятой красными.
export const capturedShare = (w: World, frame: number) => {
  const th = thrAt(w, frame);
  const a = w.blueSorted;
  let lo = 0;
  let hi = a.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (a[mid] <= th) lo = mid + 1;
    else hi = mid;
  }
  return lo / a.length;
};

let cache: Promise<World> | null = null;
export const loadWorld = () => {
  if (!cache) cache = build();
  return cache;
};
