import React, {useLayoutEffect, useRef} from 'react';
import {mixPacked} from '../lib/terrain';
import {GLOW_RGB, MAP_H, MAP_W, MAX_EVENTS, type War} from './engine';

const packRGB = (c: [number, number, number]) => (255 << 24) | (c[2] << 16) | (c[1] << 8) | c[0];
const GLOW = [0, 1, 2, 3].map((f) => (GLOW_RGB[f] ? packRGB(GLOW_RGB[f]) : 0));
const BORDER = packRGB([246, 246, 246]);
const GLOW_FRAMES = 14;

let frameBuf: ImageData | null = null;
let own: Uint8Array | null = null;
let age: Uint16Array | null = null;

// Попиксельно: хозяин каждого пикселя на этом кадре, свечение свежих захватов, белые границы.
const paint = (ctx: CanvasRenderingContext2D, w: War, frame: number) => {
  if (!frameBuf) frameBuf = ctx.createImageData(MAP_W, MAP_H);
  const n = MAP_W * MAP_H;
  if (!own) own = new Uint8Array(n);
  if (!age) age = new Uint16Array(n);
  const out = new Uint32Array(frameBuf.data.buffer);
  const {kind, evN, evF, evS, base, cols} = w;

  for (let i = 0; i < n; i++) {
    const k = kind[i];
    if (!k) {
      own[i] = 0;
      continue;
    }
    let o = k;
    let last = -1;
    const cnt = evN[i];
    const b = i * MAX_EVENTS;
    for (let e = 0; e < cnt; e++) {
      const f = evF[b + e];
      if (f > frame) break;
      o = evS[b + e];
      last = f;
    }
    own[i] = o;
    age[i] = last < 0 ? 65535 : frame - last;
  }

  for (let i = 0; i < n; i++) {
    const o = own[i];
    if (!o) {
      out[i] = base[i];
      continue;
    }
    let c = cols[o][i];
    const a = age[i];
    if (a < GLOW_FRAMES) c = mixPacked(GLOW[o], c, Math.sqrt(a / GLOW_FRAMES));
    const x = i % MAP_W;
    const l = x > 0 ? own[i - 1] : 0;
    const r = x < MAP_W - 1 ? own[i + 1] : 0;
    const u = i >= MAP_W ? own[i - MAP_W] : 0;
    const d = i < n - MAP_W ? own[i + MAP_W] : 0;
    if ((l && l !== o) || (r && r !== o) || (u && u !== o) || (d && d !== o)) c = mixPacked(c, BORDER, 0.82);
    out[i] = c;
  }
  ctx.putImageData(frameBuf, 0, 0);
};

export const WarCanvas: React.FC<{war: War; frame: number}> = ({war, frame}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (ctx) paint(ctx, war, frame);
  }, [war, frame]);
  return <canvas ref={ref} width={MAP_W} height={MAP_H} style={{position: 'absolute', left: 0, top: 0, width: MAP_W, height: MAP_H}} />;
};
