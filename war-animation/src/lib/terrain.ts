// Общая часть для обоих роликов: распознавание карты, шум, поиск путей по пикселям.
export const MAP_W = 1536;
export const MAP_H = 1024;
export const N = MAP_W * MAP_H;

export type RGB = [number, number, number];

export const SEA: RGB = [23, 28, 37];
export const RED: RGB = [152, 29, 30];
export const BLUE: RGB = [30, 77, 145];
export const COAST: RGB = [236, 240, 248];

export const pack = (c: RGB) => (255 << 24) | (c[2] << 16) | (c[1] << 8) | c[0];

export const mixPacked = (a: number, b: number, t: number) => {
  const u = 1 - t;
  const r = (a & 255) * u + (b & 255) * t;
  const g = ((a >>> 8) & 255) * u + ((b >>> 8) & 255) * t;
  const bl = ((a >>> 16) & 255) * u + ((b >>> 16) & 255) * t;
  return (255 << 24) | (bl << 16) | (g << 8) | r;
};

export const mix = (a: RGB, b: RGB, t: number): RGB => [
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t),
];

export const scale = (c: RGB, k: number): RGB => [
  Math.max(0, Math.min(255, Math.round(c[0] * k))),
  Math.max(0, Math.min(255, Math.round(c[1] * k))),
  Math.max(0, Math.min(255, Math.round(c[2] * k))),
];

// ---------- шум ----------
export const hash2 = (x: number, y: number, s: number) => {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(s, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

export const vnoise = (x: number, y: number, s: number) => {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, s);
  const b = hash2(xi + 1, yi, s);
  const c = hash2(xi, yi + 1, s);
  const d = hash2(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};

export const fbm = (x: number, y: number, oct: number, s: number) => {
  let sum = 0;
  let amp = 0.5;
  let f = 1;
  let norm = 0;
  for (let o = 0; o < oct; o++) {
    sum += amp * vnoise(x * f, y * f, s + o * 17);
    norm += amp;
    amp *= 0.5;
    f *= 2.03;
  }
  return sum / norm;
};

// Компоненты связности (4-связность) для пикселей с mask[i] === value.
export const components = (mask: Uint8Array, value: number) => {
  const label = new Int32Array(N).fill(-1);
  const areas: number[] = [];
  const touchesBorder: boolean[] = [];
  const stack = new Int32Array(N);
  for (let s = 0; s < N; s++) {
    if (mask[s] !== value || label[s] !== -1) continue;
    const id = areas.length;
    let area = 0;
    let border = false;
    let sp = 0;
    stack[sp++] = s;
    label[s] = id;
    while (sp > 0) {
      const i = stack[--sp];
      area++;
      const x = i % MAP_W;
      const y = (i / MAP_W) | 0;
      if (x === 0 || y === 0 || x === MAP_W - 1 || y === MAP_H - 1) border = true;
      if (x > 0 && mask[i - 1] === value && label[i - 1] === -1) (label[i - 1] = id), (stack[sp++] = i - 1);
      if (x < MAP_W - 1 && mask[i + 1] === value && label[i + 1] === -1) (label[i + 1] = id), (stack[sp++] = i + 1);
      if (y > 0 && mask[i - MAP_W] === value && label[i - MAP_W] === -1) (label[i - MAP_W] = id), (stack[sp++] = i - MAP_W);
      if (y < MAP_H - 1 && mask[i + MAP_W] === value && label[i + MAP_W] === -1) (label[i + MAP_W] = id), (stack[sp++] = i + MAP_W);
    }
    areas.push(area);
    touchesBorder.push(border);
  }
  return {label, areas, touchesBorder};
};

// Дейкстра по сетке пикселей (8 соседей); стоимость шага = длина / скорость.
// init[i] < ∞ — источник с начальным значением; domain (если задан) ограничивает,
// в какие пиксели фронт может распространяться.
export const dijkstra = (speed: Float32Array, init: Float32Array, domain?: Uint8Array) => {
  const dist = init.slice();
  const heap = new Int32Array(N);
  const pos = new Int32Array(N).fill(-1);
  const done = new Uint8Array(N);
  let size = 0;

  const up = (k: number) => {
    const v = heap[k];
    const dv = dist[v];
    while (k > 0) {
      const p = (k - 1) >> 1;
      const pv = heap[p];
      if (dist[pv] <= dv) break;
      heap[k] = pv;
      pos[pv] = k;
      k = p;
    }
    heap[k] = v;
    pos[v] = k;
  };
  const down = (k: number) => {
    const v = heap[k];
    const dv = dist[v];
    for (;;) {
      let c = 2 * k + 1;
      if (c >= size) break;
      if (c + 1 < size && dist[heap[c + 1]] < dist[heap[c]]) c++;
      if (dist[heap[c]] >= dv) break;
      heap[k] = heap[c];
      pos[heap[k]] = k;
      k = c;
    }
    heap[k] = v;
    pos[v] = k;
  };

  for (let i = 0; i < N; i++) {
    if (dist[i] === Infinity) continue;
    heap[size] = i;
    pos[i] = size;
    size++;
    up(size - 1);
  }

  const DX = [1, -1, 0, 0, 1, 1, -1, -1];
  const DY = [0, 0, 1, -1, 1, -1, 1, -1];
  const DL = [1, 1, 1, 1, Math.SQRT2, Math.SQRT2, Math.SQRT2, Math.SQRT2];
  while (size > 0) {
    const u = heap[0];
    size--;
    if (size > 0) {
      heap[0] = heap[size];
      pos[heap[0]] = 0;
      down(0);
    }
    done[u] = 1;
    const ux = u % MAP_W;
    const uy = (u / MAP_W) | 0;
    const du = dist[u];
    const su = speed[u];
    for (let k = 0; k < 8; k++) {
      const nx = ux + DX[k];
      const ny = uy + DY[k];
      if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) continue;
      const v = ny * MAP_W + nx;
      if (done[v] || (domain && !domain[v])) continue;
      const nd = du + (DL[k] * 2) / (su + speed[v]);
      if (nd < dist[v]) {
        dist[v] = nd;
        if (pos[v] < 0) {
          heap[size] = v;
          pos[v] = size;
          size++;
          up(size - 1);
        } else {
          up(pos[v]);
        }
      }
    }
  }
  return dist;
};

// Суша и исходный владелец каждого пикселя по цвету картинки (channels — 3 для RGB, 4 для RGBA).
export const classify = (px: ArrayLike<number>, channels: number) => {
  // 1. Суша / владелец по цвету пикселя.
  const landMask = new Uint8Array(N);
  const owner = new Uint8Array(N); // 0 — неизвестно (белые границы), 1 — красные, 2 — синие
  for (let i = 0; i < N; i++) {
    const r = px[i * channels];
    const g = px[i * channels + 1];
    const b = px[i * channels + 2];
    const dr = r - SEA[0];
    const dg = g - SEA[1];
    const db = b - SEA[2];
    if (dr * dr + dg * dg + db * db < 48 * 48) continue;
    landMask[i] = 1;
    if (r - b > 40 && r - g > 40) owner[i] = 1;
    else if (b - r > 40) owner[i] = 2;
  }

  // 2. Чистим мусор: мелкие «острова» удаляем, мелкие «озёра» заливаем.
  const lc = components(landMask, 1);
  for (let i = 0; i < N; i++) if (landMask[i] && lc.areas[lc.label[i]] < 12) landMask[i] = 0;
  const sc = components(landMask, 0);
  for (let i = 0; i < N; i++) {
    if (landMask[i]) continue;
    const id = sc.label[i];
    if (sc.areas[id] < 80 && !sc.touchesBorder[id]) landMask[i] = 1;
  }

  // 3. Владельца белых пикселей границ берём от ближайшего цветного соседа.
  {
    const queue = new Int32Array(N);
    let qh = 0;
    let qt = 0;
    for (let i = 0; i < N; i++) if (landMask[i] && owner[i]) queue[qt++] = i;
    while (qh < qt) {
      const i = queue[qh++];
      const x = i % MAP_W;
      const nb = [x > 0 ? i - 1 : -1, x < MAP_W - 1 ? i + 1 : -1, i - MAP_W, i + MAP_W];
      for (const j of nb) {
        if (j < 0 || j >= N || !landMask[j] || owner[j]) continue;
        owner[j] = owner[i];
        queue[qt++] = j;
      }
    }
    for (let i = 0; i < N; i++) {
      if (landMask[i] && !owner[i]) owner[i] = i % MAP_W < 760 ? 1 : 2;
      if (!landMask[i]) owner[i] = 0;
    }
  }
  // Сглаживание мелких вкраплений (мажоритарный фильтр 3×3).
  {
    const copy = owner.slice();
    for (let y = 1; y < MAP_H - 1; y++) {
      for (let x = 1; x < MAP_W - 1; x++) {
        const i = y * MAP_W + x;
        if (!copy[i]) continue;
        let red = 0;
        let blue = 0;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const o = copy[i + dy * MAP_W + dx];
            if (o === 1) red++;
            else if (o === 2) blue++;
          }
        if (red >= 6) owner[i] = 1;
        else if (blue >= 6) owner[i] = 2;
      }
    }
  }

  return {kind: owner, lc}; // kind: 0 море, 1 красные, 2 синие
};

// Яркость береговой линии: 0.9 у самого берега, слабее на втором пикселе и в море.
export const coastField = (kind: Uint8Array) => {
  const coast = new Float32Array(N);
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const i = y * MAP_W + x;
      const land = kind[i] !== 0;
      let near1 = false;
      let near2 = false;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) continue;
          const other = kind[ny * MAP_W + nx] !== 0;
          if (other === land) continue;
          const dd = Math.abs(dx) + Math.abs(dy);
          if (dd <= 1) near1 = true;
          else if (dd <= 2) near2 = true;
        }
      }
      coast[i] = land ? (near1 ? 0.9 : near2 ? 0.28 : 0) : near1 ? 0.35 : near2 ? 0.12 : 0;
    }
  }

  return coast;
};
