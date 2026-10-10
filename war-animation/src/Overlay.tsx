import React from 'react';
import {Easing, interpolate} from 'remotion';
import {arrowD, pointAt, polylineD, type Pt, slicePath} from './geometry';
import {T, clamp01, smoothstep} from './timeline';
import {MAP_H, MAP_W, frontIndex, smoothFront, thrAt, type World} from './world';

const RED_DOT = '#ff4f3d';
const BLUE_DOT = '#4c9dff';

const easeOutBack = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

const appearScale = (frame: number, appear: number, dur = 12) => {
  const t = clamp01((frame - appear) / dur);
  return t <= 0 ? 0 : easeOutBack(t);
};

const victoryFade = (frame: number) => 1 - smoothstep(T.victory - 10, T.victory + 25, frame);

// ---------- стрелки ----------
const AxisArrows: React.FC<{world: World; frame: number}> = ({world, frame}) => {
  const fade = victoryFade(frame);
  if (fade <= 0) return null;
  return (
    <g opacity={fade}>
      {world.axes.map((axis, a) => {
        const pts = axis.path.pts;
        const delay = T.planStart + a * 14;
        const plan = smoothstep(delay, delay + 45, frame);
        const grow = smoothstep(delay + 25, delay + 70, frame);
        const front = Math.max(axis.arrowFrom + 4, smoothFront(world, axis.path, frame) + 14);
        const tip = Math.min(pts.length - 1, axis.arrowFrom + (front - axis.arrowFrom) * grow);
        const planTo = axis.arrowFrom + (pts.length - 1 - axis.arrowFrom) * plan;
        const planPts = slicePath(pts, Math.max(axis.arrowFrom, tip - 4), planTo);
        const body = slicePath(pts, axis.arrowFrom, tip);
        const tail = pts[axis.arrowFrom];
        const end = pts[pts.length - 1];
        const reached = tip >= pts.length - 1.5;
        const labelPos = pointAt(pts, axis.arrowFrom + 6);
        return (
          <g key={axis.plan.id}>
            <defs>
              <linearGradient id={`ag-${a}`} gradientUnits="userSpaceOnUse" x1={tail[0]} y1={tail[1]} x2={end[0]} y2={end[1]}>
                <stop offset="0" stopColor="#ff6a4d" stopOpacity={0.35} />
                <stop offset="0.6" stopColor="#ff3b2b" stopOpacity={0.85} />
                <stop offset="1" stopColor="#ff2a1a" stopOpacity={0.95} />
              </linearGradient>
            </defs>
            {planPts.length > 1 && !reached ? (
              <path
                d={polylineD(planPts)}
                fill="none"
                stroke="#ffe3d6"
                strokeOpacity={0.75}
                strokeWidth={2.4}
                strokeDasharray="9 9"
                strokeDashoffset={-frame * 0.9}
                strokeLinecap="round"
              />
            ) : null}
            {plan > 0.98 && !reached ? (
              <circle cx={end[0]} cy={end[1]} r={7 + Math.sin(frame * 0.2) * 1.5} fill="none" stroke="#ffe3d6" strokeOpacity={0.8} strokeWidth={2} />
            ) : null}
            {body.length > 2 ? (
              <path
                d={arrowD(body, {tailW: 12, bodyW: 30, headW: 62, headL: 46})}
                fill={`url(#ag-${a})`}
                stroke="#fff4ee"
                strokeWidth={2.2}
                strokeLinejoin="round"
                filter="url(#shadow)"
              />
            ) : null}
            <g
              opacity={smoothstep(delay, delay + 20, frame)}
              transform={`translate(${labelPos[0]} ${labelPos[1] - 34})`}
            >
              <rect x={-52} y={-15} width={104} height={30} rx={7} fill="#2a0b0b" fillOpacity={0.85} stroke="#ff6a55" strokeWidth={1.6} />
              <text x={0} y={6} textAnchor="middle" fontSize={16} fill="#fff" fontFamily="Russo One" letterSpacing={0.5}>
                {axis.plan.label}
              </text>
            </g>
          </g>
        );
      })}
    </g>
  );
};

const Landings: React.FC<{world: World; frame: number}> = ({world, frame}) => {
  const fade = victoryFade(frame);
  if (fade <= 0) return null;
  const th = thrAt(world, frame);
  return (
    <g opacity={fade}>
      {world.landings.map((g, k) => {
        if (frontIndex(g, th + world.maxDist * 0.06) < 0) return null;
        const idx = Math.max(0, smoothFront(world, g, frame, world.maxDist * 0.06));
        const body = slicePath(g.pts, 0, Math.max(1.5, idx));
        const boatIdx = Math.max(0, smoothFront(world, g, frame, world.maxDist * 0.01));
        const started = frontIndex(g, th) >= 0;
        return (
          <g key={k}>
            {body.length > 2 ? (
              <path
                d={arrowD(body, {tailW: 6, bodyW: 13, headW: 30, headL: 22})}
                fill="#ff3b2b"
                fillOpacity={0.8}
                stroke="#fff4ee"
                strokeWidth={1.6}
                strokeDasharray="5 4"
                filter="url(#shadow)"
              />
            ) : null}
            {started
              ? [0, 4].map((back) => {
                  const p = pointAt(g.pts, Math.max(0, boatIdx - back));
                  return <circle key={back} cx={p[0]} cy={p[1]} r={4.5} fill={RED_DOT} stroke="#fff" strokeWidth={1.5} />;
                })
              : null}
          </g>
        );
      })}
    </g>
  );
};

const CounterAttack: React.FC<{world: World; frame: number}> = ({world, frame}) => {
  const {pts, tipIdx, units} = world.counter;
  const start = T.counterStart;
  if (frame < start || frame > T.counterRepelled + 60) return null;
  const grow = Easing.out(Easing.cubic)(clamp01((frame - start) / 55));
  const repel = clamp01((frame - T.counterRepelled) / 30);
  const tip = Math.max(2, tipIdx * grow * (1 - 0.6 * repel));
  const body = slicePath(pts, 0, tip);
  const tipPt = pointAt(pts, tipIdx);
  const shake = frame > T.counterRepelled - 6 && frame < T.counterRepelled + 12 ? Math.sin(frame * 2.7) * 3 : 0;
  const xT = frame - T.counterRepelled;
  return (
    <g>
      <g opacity={1 - repel} transform={`translate(${shake} 0)`}>
        <defs>
          <linearGradient id="cg" gradientUnits="userSpaceOnUse" x1={pts[0][0]} y1={pts[0][1]} x2={tipPt[0]} y2={tipPt[1]}>
            <stop offset="0" stopColor="#5aa8ff" stopOpacity={0.35} />
            <stop offset="1" stopColor="#2f86ff" stopOpacity={0.95} />
          </linearGradient>
        </defs>
        {body.length > 2 ? (
          <path
            d={arrowD(body, {tailW: 10, bodyW: 24, headW: 50, headL: 38})}
            fill="url(#cg)"
            stroke="#eef6ff"
            strokeWidth={2}
            filter="url(#shadow)"
          />
        ) : null}
        {units.map((u, k) => {
          if (frame >= u.death + 10) return null;
          const idx = Math.max(0, tip - u.lag / 3 - 2);
          const p = pointAt(pts, idx);
          const dying = clamp01((frame - u.death) / 10);
          return (
            <circle
              key={k}
              cx={p[0]}
              cy={p[1] + u.o}
              r={5 * (1 - dying)}
              fill={dying > 0 ? '#ffd6a0' : BLUE_DOT}
              stroke="#fff"
              strokeWidth={1.5}
            />
          );
        })}
      </g>
      {xT >= 0 && xT < 60 ? (
        <g opacity={1 - smoothstep(35, 60, xT)} transform={`translate(${tipPt[0]} ${tipPt[1]}) scale(${interpolate(xT, [0, 8], [2.2, 1], {extrapolateRight: 'clamp'})})`}>
          <circle r={26} fill="#2a0b0b" fillOpacity={0.6} stroke="#ff4f3d" strokeWidth={3} />
          <path d="M-12 -12L12 12M12 -12L-12 12" stroke="#ff4f3d" strokeWidth={6} strokeLinecap="round" />
        </g>
      ) : null}
    </g>
  );
};

// ---------- войска ----------
const RedUnits: React.FC<{world: World; frame: number}> = ({world, frame}) => {
  const pulse = smoothstep(T.victory, T.victory + 20, frame);
  return (
    <g>
      {world.redUnits.map((u, k) => {
        const s = appearScale(frame, u.appear);
        if (s <= 0) return null;
        let idx: number;
        if (frame < T.offStart) {
          const t = Easing.inOut(Easing.cubic)(clamp01((frame - u.appear) / Math.max(30, u.deployEnd - u.appear)));
          idx = u.stage * t;
        } else {
          idx = Math.max(u.stage, smoothFront(world, u.path, frame) - u.back);
        }
        const p: Pt = pointAt(u.path.pts, idx);
        const wx = Math.sin(frame * 0.13 + u.seed) * 1.3;
        const wy = Math.cos(frame * 0.11 + u.seed * 1.7) * 1.3;
        const r = u.r * s * (1 + pulse * 0.25 * Math.max(0, Math.sin(frame * 0.25 + u.seed * 0.3)));
        return (
          <g key={k} transform={`translate(${p[0] + wx} ${p[1] + wy})`}>
            <circle r={r} fill={RED_DOT} stroke="#fff" strokeWidth={1.8} />
            {u.r > 6 ? <circle r={2.2 * s} fill="#fff" /> : null}
          </g>
        );
      })}
    </g>
  );
};

const BlueUnits: React.FC<{world: World; frame: number}> = ({world, frame}) => {
  const th = thrAt(world, frame);
  const R = world.maxDist * 0.05;
  return (
    <g>
      {world.blueUnits.map((u, k) => {
        const s = appearScale(frame, u.appear);
        if (s <= 0) return null;
        const t = u.dTarget > u.dHome - R ? smoothstep(u.dHome - R, u.dTarget, th) : 0;
        const x = u.home[0] + (u.target[0] - u.home[0]) * t;
        const y = u.home[1] + (u.target[1] - u.home[1]) * t;
        const dt = frame - u.death;
        if (dt >= 0) {
          if (dt > 90) return null;
          const ring = clamp01(dt / 16);
          const mark = 1 - smoothstep(30, 90, dt);
          return (
            <g key={k} transform={`translate(${x} ${y})`}>
              {dt < 16 ? (
                <>
                  <circle r={4 + ring * 22} fill="none" stroke="#ffb347" strokeWidth={3 * (1 - ring) + 0.5} opacity={1 - ring} />
                  <circle r={6 * (1 - ring)} fill="#fff1c9" />
                </>
              ) : null}
              <path d="M-5 -5L5 5M5 -5L-5 5" stroke="#1a0606" strokeOpacity={0.75 * mark * smoothstep(4, 14, dt)} strokeWidth={2.6} strokeLinecap="round" />
            </g>
          );
        }
        const wx = Math.sin(frame * 0.1 + u.seed) * 1;
        const wy = Math.cos(frame * 0.12 + u.seed * 0.7) * 1;
        const alarm = t > 0 ? 1 + 0.15 * Math.sin(frame * 0.6 + u.seed) : 1;
        return (
          <circle
            key={k}
            cx={x + wx}
            cy={y + wy}
            r={u.r * s * alarm}
            fill={BLUE_DOT}
            stroke="#fff"
            strokeWidth={1.8}
          />
        );
      })}
    </g>
  );
};

const Bursts: React.FC<{world: World; frame: number}> = ({world, frame}) => (
  <g>
    {world.bursts.map((b, k) => {
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

export const Overlay: React.FC<{world: World; frame: number}> = ({world, frame}) => (
  <svg
    width={MAP_W}
    height={MAP_H}
    viewBox={`0 0 ${MAP_W} ${MAP_H}`}
    style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}
  >
    <defs>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#000" floodOpacity="0.55" />
      </filter>
      <filter id="dots" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#000" floodOpacity="0.6" />
      </filter>
      <radialGradient id="burst">
        <stop offset="0" stopColor="#fff3c4" stopOpacity={1} />
        <stop offset="0.35" stopColor="#ffb347" stopOpacity={0.9} />
        <stop offset="1" stopColor="#ff4b1f" stopOpacity={0} />
      </radialGradient>
    </defs>
    <AxisArrows world={world} frame={frame} />
    <Landings world={world} frame={frame} />
    <CounterAttack world={world} frame={frame} />
    <Bursts world={world} frame={frame} />
    <g filter="url(#dots)">
      <BlueUnits world={world} frame={frame} />
      <RedUnits world={world} frame={frame} />
    </g>
  </svg>
);
