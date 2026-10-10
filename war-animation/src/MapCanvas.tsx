import React, {useLayoutEffect, useRef} from 'react';
import {T, smoothstep} from './timeline';
import {EDGE, GLOW, MAP_H, MAP_W, mixPacked, thrAt, type World} from './world';

const packRGB = (c: [number, number, number]) => (255 << 24) | (c[2] << 16) | (c[1] << 8) | c[0];
const GLOW_P = packRGB(GLOW);
const EDGE_P = packRGB(EDGE);

let frameBuf: ImageData | null = null;

// Попиксельная отрисовка территорий: всё, что «захвачено» к этому кадру, — красное.
const paint = (ctx: CanvasRenderingContext2D, w: World, frame: number) => {
  if (!frameBuf) frameBuf = ctx.createImageData(MAP_W, MAP_H);
  const out = new Uint32Array(frameBuf.data.buffer);
  const {kind, rdist, base, blueCol, occCol, redCol} = w;
  const th = thrAt(w, frame);
  const band = w.maxDist * 0.035; // ширина «горящей» полосы за линией фронта
  const unify = smoothstep(T.victory, T.victory + 40, frame); // штриховка уходит после победы
  const W = MAP_W;
  const n = kind.length;

  for (let i = 0; i < n; i++) {
    const k = kind[i];
    if (k !== 2) {
      out[i] = base[i];
      continue;
    }
    const d = rdist[i];
    if (d <= th) {
      let c = unify > 0 ? mixPacked(occCol[i], redCol[i], unify) : occCol[i];
      const delta = th - d;
      if (delta < band) {
        const t = delta / band;
        c = mixPacked(GLOW_P, c, Math.sqrt(t));
      }
      out[i] = c;
    } else if (d - th < band * 0.5) {
      // линия фронта: синие пиксели, соседствующие с захваченными
      let near = 0;
      const x = i % W;
      if ((x > 0 && rdist[i - 1] <= th) || (x < W - 1 && rdist[i + 1] <= th) || rdist[i - W] <= th || rdist[i + W] <= th) near = 1;
      else if ((x > 1 && rdist[i - 2] <= th) || (x < W - 2 && rdist[i + 2] <= th) || rdist[i - 2 * W] <= th || rdist[i + 2 * W] <= th) near = 0.55;
      out[i] = near > 0 ? mixPacked(blueCol[i], EDGE_P, near) : blueCol[i];
    } else {
      out[i] = blueCol[i];
    }
  }
  ctx.putImageData(frameBuf, 0, 0);
};

export const MapCanvas: React.FC<{world: World; frame: number}> = ({world, frame}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (ctx) paint(ctx, world, frame);
  }, [world, frame]);
  return (
    <canvas
      ref={ref}
      width={MAP_W}
      height={MAP_H}
      style={{position: 'absolute', left: 0, top: 0, width: MAP_W, height: MAP_H}}
    />
  );
};
