// Простой синтезатор звуков войны: всё генерируется кодом, без внешних сэмплов.
export const SR = 44100;

type Rand = () => number;

// Полосовой фильтр (state variable, Чемберлин).
const svf = () => {
  let low = 0;
  let band = 0;
  return (x: number, fc: number, damp: number) => {
    const f = 2 * Math.sin((Math.PI * Math.min(fc, SR / 6)) / SR);
    low += f * band;
    const high = x - low - damp * band;
    band += f * high;
    return {low, band, high};
  };
};

const onePole = () => {
  let y = 0;
  return (x: number, fc: number) => {
    y += (1 - Math.exp((-2 * Math.PI * fc) / SR)) * (x - y);
    return y;
  };
};

// Взрыв: низкий «удар» + шумовой хвост, который темнеет со временем.
export const explosion = (rand: Rand, size: number) => {
  const dur = 1 + 2.2 * size;
  const out = new Float32Array(Math.floor(dur * SR));
  const lp1 = onePole();
  const lp2 = onePole();
  const decay = 0.22 + 0.55 * size;
  const thumpDecay = 0.15 + 0.25 * size;
  let ph = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const fc = 150 + 5000 * Math.exp(-t / 0.05) + 900 * size * Math.exp(-t / 0.5);
    const n = lp2(lp1(rand() * 2 - 1, fc), fc);
    const env = Math.min(1, t / 0.004) * Math.exp(-t / decay);
    ph += (2 * Math.PI * (38 + 70 * Math.exp(-t / 0.1))) / SR;
    const thump = Math.sin(ph) * Math.exp(-t / thumpDecay) * Math.min(1, t / 0.002);
    const crack = rand() < 0.003 * Math.exp(-t / 0.5) ? (rand() * 2 - 1) * 0.6 : 0;
    out[i] = Math.tanh(1.6 * (n * 2.4 * env + thump * 0.95 + crack * env));
  }
  return out;
};

// Одиночный выстрел: щелчок + короткий шумовой хлопок + эхо.
export const gunshot = (rand: Rand, far: number) => {
  const out = new Float32Array(Math.floor(0.4 * SR));
  const bp = svf();
  const lp = onePole();
  const fc = 2200 * (1 - 0.55 * far);
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const w = rand() * 2 - 1;
    const body = bp(w, fc, 0.9).band * Math.exp(-t / 0.011);
    const tail = lp(w, 700) * 0.9 * Math.exp(-t / (0.08 + 0.1 * far));
    const click = t < 0.0012 ? 0.9 * (1 - far) : 0;
    out[i] = Math.tanh(2.2 * (body * 1.4 + tail + click));
  }
  return out;
};

// Свист пролетающей стрелки / снаряда: шум с плывущей полосой.
export const whoosh = (rand: Rand, dur: number, up: boolean) => {
  const out = new Float32Array(Math.floor(dur * SR));
  const bp = svf();
  for (let i = 0; i < out.length; i++) {
    const u = i / out.length;
    const k = up ? u : 1 - u;
    const fc = 250 * Math.pow(9, k);
    const env = Math.pow(Math.sin(Math.PI * Math.pow(u, up ? 0.7 : 1.4)), 2);
    out[i] = bp(rand() * 2 - 1, fc, 0.45).band * env * 1.6;
  }
  return out;
};

// Военный барабан.
export const drum = (rand: Rand, accent: number) => {
  const out = new Float32Array(Math.floor(1.3 * SR));
  const lp = onePole();
  let ph = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    ph += (2 * Math.PI * (50 + 65 * Math.exp(-t / 0.045))) / SR;
    const body = Math.sin(ph) * Math.exp(-t / 0.4);
    const skin = lp(rand() * 2 - 1, 1100) * Math.exp(-t / 0.035) * 2.2;
    out[i] = Math.tanh(1.5 * (body + skin)) * accent;
  }
  return out;
};

// Тёмный «струнный» гул: детюненные пилы через фильтр.
export const drone = (freqs: number[], dur: number, fade: number) => {
  const out = new Float32Array(Math.floor(dur * SR));
  const lp1 = onePole();
  const lp2 = onePole();
  const phases = freqs.flatMap(() => [0, 0.33, 0.66]);
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    let s = 0;
    freqs.forEach((f, v) => {
      [0.997, 1, 1.0035].forEach((d, k) => {
        const p = v * 3 + k;
        phases[p] = (phases[p] + (f * d) / SR) % 1;
        s += (phases[p] * 2 - 1) / (1 + v * 0.35);
      });
    });
    const fc = 420 + 160 * Math.sin((2 * Math.PI * t) / 9);
    const env = Math.min(1, t / fade, (dur - t) / fade);
    out[i] = lp2(lp1(s * 0.09, fc), fc) * Math.max(0, env);
  }
  return out;
};

// Низкий гул боя (коричневый шум).
export const rumble = (rand: Rand, len: number, level: (t: number) => number) => {
  const out = new Float32Array(len);
  const lp = onePole();
  let brown = 0;
  for (let i = 0; i < len; i++) {
    brown = brown * 0.998 + (rand() * 2 - 1) * 0.06;
    out[i] = lp(brown, 160) * level(i / SR) * 3;
  }
  return out;
};

// Реверберация Шрёдера: 4 гребенчатых + 2 всепропускающих фильтра.
export const reverb = (input: Float32Array, spread: number) => {
  const combs = [1557, 1617, 1491, 1422].map((d) => d + spread);
  const out = new Float32Array(input.length);
  for (const d of combs) {
    const buf = new Float32Array(d);
    let idx = 0;
    let damp = 0;
    for (let i = 0; i < input.length; i++) {
      const y = buf[idx];
      damp = y * 0.6 + damp * 0.4;
      buf[idx] = input[i] + damp * 0.84;
      idx = (idx + 1) % d;
      out[i] += y * 0.25;
    }
  }
  for (const d of [225 + spread, 556 + spread]) {
    const buf = new Float32Array(d);
    let idx = 0;
    for (let i = 0; i < out.length; i++) {
      const b = buf[idx];
      const y = -out[i] + b;
      buf[idx] = out[i] + b * 0.5;
      idx = (idx + 1) % d;
      out[i] = y;
    }
  }
  return out;
};

export const writeWav = (left: Float32Array, right: Float32Array) => {
  const n = left.length;
  const buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * 4, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 4, 28);
  buf.writeUInt16LE(4, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, left[i])) * 32767), 44 + i * 4);
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, right[i])) * 32767), 46 + i * 4);
  }
  return buf;
};
