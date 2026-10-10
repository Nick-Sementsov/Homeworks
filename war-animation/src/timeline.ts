// Тайминги ролика (30 fps). Все остальные модули считают время от этих отметок.
export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;
export const DURATION = 1110;

export const T = {
  deployStart: 20, // появляются войска
  deployEnd: 140, // войска вышли на исходные позиции
  planStart: 115, // рисуются планы ударов (пунктир)
  planEnd: 195,
  offStart: 200, // начало наступления
  offEnd: 935, // вся территория захвачена
  victory: 950, // баннер победы
  counterStart: 430, // контрудар синих
  counterRepelled: 505, // контрудар отбит
};

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

export const smoothstep = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

// Темп наступления в каждый кадр: разгон, замедление во время контрудара,
// прорыв после него и «зачистка» в конце.
const rate = (f: number) => {
  if (f < T.offStart || f > T.offEnd) return 0;
  const u = (f - T.offStart) / (T.offEnd - T.offStart);
  let r = smoothstep(0, 0.1, u) * (1 - 0.55 * smoothstep(0.86, 1, u));
  const stall =
    smoothstep(T.counterStart - 30, T.counterStart + 25, f) *
    (1 - smoothstep(T.counterRepelled - 10, T.counterRepelled + 30, f));
  r *= 1 - 0.7 * stall;
  r *= 1 + 0.35 * smoothstep(T.counterRepelled, T.counterRepelled + 60, f);
  return r;
};

// progress[f] — доля «пути фронта», пройденная к кадру f (0..1, монотонно).
export const progress: Float32Array = (() => {
  const out = new Float32Array(DURATION + 1);
  let acc = 0;
  for (let f = 0; f <= DURATION; f++) {
    acc += rate(f);
    out[f] = acc;
  }
  const total = out[T.offEnd];
  for (let f = 0; f <= DURATION; f++) out[f] = Math.min(1, out[f] / total);
  return out;
})();

export const progressAt = (f: number) =>
  progress[Math.max(0, Math.min(DURATION, Math.floor(f)))];
