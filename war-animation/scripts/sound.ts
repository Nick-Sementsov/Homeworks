// Генерирует звуковую дорожку для композиции Rebellion: npm run sound.
// Карта и фронты считаются тем же движком, что и в видео, поэтому каждый взрыв
// и выстрел звучит ровно в тот кадр, когда он виден на экране.
import {execFileSync} from 'node:child_process';
import {mkdirSync, rmSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {rng} from '../src/geometry';
import {armyCenter, cameraAt} from '../src/rebellion/engine';
import {DURATION, FPS, SOUNDTRACK} from '../src/rebellion/scenario';
import {loadWarFromDisk} from './load-war';
import {SR, drone, drum, explosion, gunshot, reverb, rumble, whoosh, writeWav} from './synth';

const war = loadWarFromDisk();
const LEN = Math.round((DURATION / FPS) * SR);
const dry = [new Float32Array(LEN), new Float32Array(LEN)];
const wet = [new Float32Array(LEN), new Float32Array(LEN)];
const rand = rng(2024);

const sampleAt = (frame: number) => Math.round((frame / FPS) * SR);

// Панорама по положению на экране с учётом камеры.
const panOf = (x: number, frame: number) => {
  const c = cameraAt(frame);
  return Math.max(-0.85, Math.min(0.85, ((x - c.cx) * c.zoom) / 960));
};

const place = (snd: Float32Array, frame: number, gain: number, pan = 0, send = 0.3) => {
  const start = sampleAt(frame);
  const gl = Math.cos(((pan + 1) * Math.PI) / 4) * Math.SQRT2 * gain;
  const gr = Math.sin(((pan + 1) * Math.PI) / 4) * Math.SQRT2 * gain;
  for (let i = 0; i < snd.length; i++) {
    const j = start + i;
    if (j < 0 || j >= LEN) continue;
    dry[0][j] += snd[i] * gl;
    dry[1][j] += snd[i] * gr;
    wet[0][j] += snd[i] * gl * send;
    wet[1][j] += snd[i] * gr * send;
  }
};

const burstOfShots = (frame: number, pan: number, gain: number, far: number) => {
  const shots = 3 + Math.floor(rand() * 5);
  const gap = (0.07 + rand() * 0.03) * FPS;
  for (let s = 0; s < shots; s++) place(gunshot(rand, far), frame + s * gap, gain * (0.8 + rand() * 0.4), pan, 0.35);
};

// Интенсивность боя по кадрам: сколько земли меняет хозяина (сглажено).
const activity = new Float32Array(DURATION + 1);
{
  const win = 20;
  for (let f = 0; f <= DURATION; f++) {
    let s = 0;
    for (let k = -win; k <= win; k++) s += war.activity[Math.max(0, Math.min(DURATION, f + k))];
    activity[f] = s;
  }
  const sorted = Array.from(activity).sort((a, b) => a - b);
  const ref = sorted[Math.floor(sorted.length * 0.95)] || 1;
  for (let f = 0; f <= DURATION; f++) activity[f] = Math.min(1, activity[f] / ref);
}
let lastEvent = 0;
for (let i = 0; i < war.evF.length; i++) if (war.evF[i] !== 65535 && war.evF[i] > lastEvent) lastEvent = war.evF[i];

// 1. Вспышки боёв на фронте: взрывы и очереди.
for (const b of war.bursts) {
  const pan = panOf(b.x, b.frame);
  if (rand() < 0.45) place(explosion(rand, 0.3 + rand() * 0.35), b.frame, 0.2, pan, 0.35);
  else burstOfShots(b.frame, pan, 0.13, 0.2 + rand() * 0.4);
}

// 2. Фон боя: далёкая стрельба и канонада, громче там, где фронт движется.
for (let f = 0; f <= DURATION; f++) {
  const a = activity[f];
  if (rand() < 0.22 * a) burstOfShots(f, (rand() * 2 - 1) * 0.7, 0.07, 0.7 + rand() * 0.3);
  if (rand() < 0.05 * a) place(explosion(rand, 0.6 + rand() * 0.3), f, 0.1, (rand() * 2 - 1) * 0.6, 0.7);
}
{
  const bed = rumble(rand, LEN, (t) => 0.025 + 0.11 * activity[Math.min(DURATION, Math.floor(t * FPS))]);
  place(bed, 0, 1, 0, 0.2);
}

// 3. Начало операции: артподготовка и «свист» стрелок; в конце — стрелки втягиваются.
for (const op of war.ops) {
  if (!op.arrows.length) continue;
  const {start, end} = op.plan;
  op.arrows.forEach((g, a) => {
    const mid = g.pts[Math.floor(g.pts.length / 2)];
    place(whoosh(rand, 1.4, true), start + a * 3, 0.22, panOf(mid[0], start), 0.4);
    place(whoosh(rand, 1.0, false), end + 4 + a * 2, 0.09, panOf(mid[0], end), 0.4);
  });
  for (let k = 0; k < 6; k++) {
    const x = op.arrows[k % op.arrows.length].pts[0][0];
    place(explosion(rand, 0.75 + rand() * 0.3), start - 20 + k * 8 + rand() * 4, 0.24, panOf(x, start), 0.55);
  }
}

// 4. Восстания: большой взрыв, свист и перестрелка.
for (const u of war.uprisings) {
  const pan = panOf(u.at[0], u.frame);
  place(explosion(rand, 1.5), u.frame, 0.6, pan, 0.45);
  place(whoosh(rand, 2, true), u.frame - 6, 0.2, pan, 0.5);
  for (let k = 0; k < 6; k++) burstOfShots(u.frame + 8 + k * 7, pan + (rand() - 0.5) * 0.3, 0.15, 0.2);
}

// 5. Гибель армий.
for (const army of war.armies) {
  if (!Number.isFinite(army.death)) continue;
  const [x] = armyCenter(war, army, army.death);
  const pan = panOf(x, army.death);
  place(explosion(rand, 1.2), army.death, 0.5, pan, 0.45);
  place(explosion(rand, 0.7), army.death + 5, 0.3, pan * 0.8, 0.45);
  place(explosion(rand, 0.6), army.death + 12, 0.22, pan * 1.1, 0.5);
}

// 6. Музыка: тёмный гул по актам и военный барабан.
const CHORDS: [number, number, number[]][] = [
  [0, 330, [55, 82.41, 110, 130.81, 164.81]],
  [330, 700, [43.65, 87.31, 130.81, 174.61, 220]],
  [700, 1010, [73.42, 110, 146.83, 174.61]],
  [1010, lastEvent, [41.2, 82.41, 123.47, 164.81, 207.65]],
  [lastEvent, DURATION, [55, 110, 130.81, 164.81, 220]],
];
for (const [f0, f1, freqs] of CHORDS) {
  const dur = (f1 - f0) / FPS + 1.5;
  place(drone(freqs, dur, f0 === 0 ? 2.5 : 1.5), f0 - 22, 0.55, 0, 0.45);
}
const beat = (60 / 84) * FPS;
const accents = [1, 0.45, 0.75, 0.45];
for (let b = 0, f = 88; f < lastEvent; b++, f = 88 + b * beat) {
  const intensity = 0.35 + 0.65 * activity[Math.floor(f)];
  place(drum(rand, accents[b % 4]), f, 0.32 * intensity, 0, 0.35);
  if (intensity > 0.7 && b % 2 === 1) place(drum(rand, 0.35), f + beat / 2, 0.25 * intensity, 0, 0.35);
}
// Красных больше нет: финальный удар.
place(explosion(rand, 1.6), lastEvent + 2, 0.55, 0, 0.6);
place(drum(rand, 1), lastEvent + 2, 0.5, 0, 0.5);

// 7. Сведение: реверберация, мягкий лимитер, нормализация, затухание в конце.
const out = [0, 1].map((c) => {
  const rv = reverb(wet[c], c * 23);
  const o = new Float32Array(LEN);
  for (let i = 0; i < LEN; i++) o[i] = Math.tanh(1.1 * (dry[c][i] + rv[i] * 0.35));
  return o;
});
let peak = 0;
for (const o of out) for (let i = 0; i < LEN; i++) peak = Math.max(peak, Math.abs(o[i]));
const fadeOut = 1.5 * SR;
for (const o of out)
  for (let i = 0; i < LEN; i++) o[i] = (o[i] / peak) * 0.9 * Math.min(1, (LEN - i) / fadeOut, i / (0.05 * SR));

const root = path.resolve(__dirname, '..');
const wav = path.join(root, 'out', 'rebellion.wav');
const target = path.join(root, 'public', SOUNDTRACK);
mkdirSync(path.dirname(wav), {recursive: true});
mkdirSync(path.dirname(target), {recursive: true});
writeFileSync(wav, writeWav(out[0], out[1]));
execFileSync('npx', ['remotion', 'ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-c:a', 'libmp3lame', '-b:a', '192k', target], {
  cwd: root,
  stdio: 'inherit',
});
rmSync(wav);
console.log(`Звук готов: public/${SOUNDTRACK}`);
