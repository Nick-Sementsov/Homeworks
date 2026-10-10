import React from 'react';
import {BODY_FONT} from '../fonts';
import {arrowD, slicePath} from '../geometry';
import {MAP_H, MAP_W, type War, armyCenter, smoothFront, smoothstep, strengthAt} from './engine';
import {BLUE, GREEN, RED} from './scenario';

const SIDE = {
  [RED]: {dot: '#ff4f3d', arrow: ['#ff6a4d', '#ff2a1a'], badge: '#6e0f0f', edge: '#ff8a7a'},
  [BLUE]: {dot: '#4c9dff', arrow: ['#6cb4ff', '#1f78ff'], badge: '#0f3270', edge: '#8cc4ff'},
  [GREEN]: {dot: '#3fdc6e', arrow: ['#6cf08f', '#1fbf4f'], badge: '#0d5226', edge: '#8ff0aa'},
} as Record<number, {dot: string; arrow: [string, string]; badge: string; edge: string}>;

const fmt = (n: number) => (Math.round(n / 10) * 10).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

const easeOutBack = (t: number) => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2);

// Стрелки ударов: растут вместе с фронтом, после операции втягиваются и исчезают.
const Arrows: React.FC<{war: War; frame: number}> = ({war, frame}) => (
  <g>
    {war.ops.flatMap((op) => {
      const {start, end} = op.plan;
      if (frame < start - 4 || frame > end + 32 || !op.arrows.length) return [];
      const side = op.sides[0];
      const grow = smoothstep(start - 4, start + 26, frame);
      const retract = smoothstep(end - 15, end + 25, frame);
      const fade = 1 - smoothstep(end + 8, end + 32, frame);
      return op.arrows.map((g, a) => {
        const tip = Math.min(g.pts.length - 1, (smoothFront(op, g, frame) + 14) * grow);
        const tail = tip * retract;
        const body = slicePath(g.pts, tail, tip);
        if (body.length < 3) return null;
        const id = `ag-${op.index}-${a}`;
        const p0 = g.pts[0];
        const p1 = g.pts[g.pts.length - 1];
        return (
          <g key={id} opacity={fade}>
            <defs>
              <linearGradient id={id} gradientUnits="userSpaceOnUse" x1={p0[0]} y1={p0[1]} x2={p1[0]} y2={p1[1]}>
                <stop offset="0" stopColor={SIDE[side].arrow[0]} stopOpacity={0.4} />
                <stop offset="1" stopColor={SIDE[side].arrow[1]} stopOpacity={0.95} />
              </linearGradient>
            </defs>
            <path
              d={arrowD(body, {tailW: 10, bodyW: 26, headW: 56, headL: 42})}
              fill={`url(#${id})`}
              stroke="#ffffff"
              strokeOpacity={0.9}
              strokeWidth={2}
              strokeLinejoin="round"
              filter="url(#shadow)"
            />
          </g>
        );
      });
    })}
  </g>
);

const Uprisings: React.FC<{war: War; frame: number}> = ({war, frame}) => (
  <g>
    {war.uprisings.map((u, k) => {
      const t = frame - u.frame;
      if (t < 0 || t > 50) return null;
      const [x, y] = u.at;
      return (
        <g key={k} transform={`translate(${x} ${y})`}>
          {[0, 12].map((d) => {
            const tt = (t - d) / 38;
            if (tt < 0 || tt > 1) return null;
            return <circle key={d} r={6 + tt * 80} fill="none" stroke="#9dffb8" strokeWidth={5 * (1 - tt) + 0.5} opacity={1 - tt} />;
          })}
          {t < 10 ? <circle r={22 * (1 - t / 10) + 4} fill="#eaffef" opacity={1 - t / 10} /> : null}
        </g>
      );
    })}
  </g>
);

const Bursts: React.FC<{war: War; frame: number}> = ({war, frame}) => (
  <g>
    {war.bursts.map((b, k) => {
      const t = frame - b.frame;
      if (t < 0 || t >= 16) return null;
      const u = t / 16;
      return (
        <g key={k} transform={`translate(${b.x} ${b.y})`}>
          <circle r={b.size * (0.35 + u)} fill="url(#burst)" opacity={1 - u} />
          {t < 4 ? <circle r={b.size * 0.3} fill="#fff8e6" opacity={1 - t / 4} /> : null}
        </g>
      );
    })}
  </g>
);

// Армии: кучка точек и численность прямо у линии фронта.
const Armies: React.FC<{war: War; frame: number}> = ({war, frame}) => (
  <g>
    {war.armies.map((army, k) => {
      const {plan, death} = army;
      if (frame < plan.spawn) return null;
      const dt = frame - death;
      if (dt > 45) return null;
      const st = SIDE[plan.side];
      const [cx, cy] = armyCenter(war, army, Math.min(frame, death));
      const appear = Math.min(1, easeOutBack(Math.min(1, (frame - plan.spawn) / 14)));
      const v = strengthAt(army, frame);
      const alive = dt < 0;
      const dots = alive ? Math.max(1, Math.min(army.offsets.length, Math.ceil(v / 2200))) : army.offsets.length;
      const label = fmt(v);
      const bw = 14 + label.length * 8.2;
      const badgeOpacity = alive ? smoothstep(0, 8, frame - plan.spawn) : 1 - smoothstep(20, 45, dt);
      return (
        <g key={k}>
          {alive || dt < 14
            ? army.offsets.slice(0, dots).map((o, j) => {
                const wx = Math.sin(frame * 0.12 + army.seed + j * 1.9) * 1.2;
                const wy = Math.cos(frame * 0.1 + army.seed * 0.7 + j) * 1.2;
                const dying = alive ? 0 : Math.min(1, dt / 14);
                const r = (j === 0 ? 6.5 : 5) * appear * (1 - dying);
                return (
                  <circle
                    key={j}
                    cx={cx + o[0] * (1 + dying * 1.5) + wx}
                    cy={cy + o[1] * (1 + dying * 1.5) + wy}
                    r={Math.max(0, r)}
                    fill={dying > 0 ? '#ffe2b0' : st.dot}
                    stroke="#fff"
                    strokeWidth={1.6}
                    filter="url(#dots)"
                  />
                );
              })
            : null}
          {!alive && dt < 22 ? (
            <g transform={`translate(${cx} ${cy})`}>
              <circle r={8 + (dt / 22) * 46} fill="url(#burst)" opacity={1 - dt / 22} />
              <circle r={10 + (dt / 22) * 60} fill="none" stroke="#ffcf8a" strokeWidth={4 * (1 - dt / 22)} opacity={1 - dt / 22} />
            </g>
          ) : null}
          {badgeOpacity > 0 ? (
            <g transform={`translate(${cx} ${cy + (plan.side === BLUE ? 40 : -38)}) scale(${appear})`} opacity={badgeOpacity}>
              <rect x={-bw / 2} y={-12} width={bw} height={24} rx={6} fill={st.badge} fillOpacity={0.92} stroke={st.edge} strokeWidth={1.5} />
              <text x={0} y={5.5} textAnchor="middle" fontSize={16} fontWeight={700} fill="#fff" fontFamily={BODY_FONT}>
                {label}
              </text>
            </g>
          ) : null}
        </g>
      );
    })}
  </g>
);

export const WarOverlay: React.FC<{war: War; frame: number}> = ({war, frame}) => (
  <svg width={MAP_W} height={MAP_H} viewBox={`0 0 ${MAP_W} ${MAP_H}`} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
    <defs>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#000" floodOpacity="0.55" />
      </filter>
      <filter id="dots" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#000" floodOpacity="0.6" />
      </filter>
      <radialGradient id="burst">
        <stop offset="0" stopColor="#fff3c4" stopOpacity={1} />
        <stop offset="0.35" stopColor="#ffb347" stopOpacity={0.9} />
        <stop offset="1" stopColor="#ff4b1f" stopOpacity={0} />
      </radialGradient>
    </defs>
    <Arrows war={war} frame={frame} />
    <Uprisings war={war} frame={frame} />
    <Bursts war={war} frame={frame} />
    <Armies war={war} frame={frame} />
  </svg>
);
