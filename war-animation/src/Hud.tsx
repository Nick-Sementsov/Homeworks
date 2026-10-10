import React from 'react';
import {AbsoluteFill, Easing, interpolate, spring} from 'remotion';
import {FPS, T, clamp01, progressAt, smoothstep} from './timeline';
import {BODY_FONT, HEAD_FONT} from './fonts';
import {capturedShare, frameWhen, type World} from './world';

const fmt = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

const panel: React.CSSProperties = {
  position: 'absolute',
  background: 'linear-gradient(180deg, rgba(14,18,26,0.88), rgba(10,13,19,0.82))',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 14,
  boxShadow: '0 10px 30px rgba(0,0,0,0.45)',
  color: '#e9eef6',
  fontFamily: BODY_FONT,
};

const Stat: React.FC<{label: string; value: string; color: string}> = ({label, value, color}) => (
  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '7px 0', borderTop: '1px solid rgba(255,255,255,0.07)'}}>
    <span style={{fontSize: 19, opacity: 0.7, letterSpacing: 0.5}}>{label}</span>
    <span style={{fontSize: 27, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums'}}>{value}</span>
  </div>
);

const FactionCard: React.FC<{
  side: 'left' | 'right';
  name: string;
  color: string;
  troops: number;
  territory: number;
  divisions: number;
  opacity: number;
  defeated: number;
}> = ({side, name, color, troops, territory, divisions, opacity, defeated}) => (
  <div
    style={{
      ...panel,
      top: 330,
      [side]: 34,
      width: 268,
      padding: '16px 20px 10px',
      opacity,
      transform: `translateX(${(side === 'left' ? -1 : 1) * (1 - opacity) * 40}px)`,
      borderTop: `4px solid ${color}`,
    }}
  >
    <div style={{display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8}}>
      <div style={{width: 18, height: 18, borderRadius: 9, background: color, boxShadow: `0 0 12px ${color}`, border: '2px solid #fff'}} />
      <div style={{fontFamily: HEAD_FONT, fontSize: 30, letterSpacing: 1.5}}>{name}</div>
    </div>
    <Stat label="Войска" value={fmt(troops)} color={color} />
    <Stat label="Территория" value={`${territory.toFixed(1)}%`} color={color} />
    <Stat label="Дивизии" value={String(divisions)} color={color} />
    {defeated > 0 ? (
      <div
        style={{
          marginTop: 8,
          padding: '6px 0',
          textAlign: 'center',
          fontFamily: HEAD_FONT,
          fontSize: 18,
          letterSpacing: 2,
          color: '#ff8a7a',
          border: '2px solid #ff8a7a',
          borderRadius: 8,
          opacity: defeated,
          transform: `scale(${1.4 - 0.4 * defeated}) rotate(-4deg)`,
        }}
      >
        КАПИТУЛЯЦИЯ
      </div>
    ) : null}
  </div>
);

const PHASES: {from: number; text: string}[] = [
  {from: 0, text: 'Развёртывание войск'},
  {from: T.planStart, text: 'Планирование ударов'},
  {from: T.offStart, text: 'Наступление по всему фронту'},
  {from: T.counterStart, text: 'Контрудар синих!'},
  {from: T.counterRepelled, text: 'Контрудар отбит — прорыв фронта'},
];

export const Hud: React.FC<{world: World; frame: number}> = ({world, frame}) => {
  const share = capturedShare(world, frame);
  const total = world.redArea + world.blueSorted.length;
  const redPct = ((world.redArea + share * world.blueSorted.length) / total) * 100;

  const landingStart = Math.min(...world.landings.map((g) => frameWhen(world, g.pm[0])));
  const phases = [...PHASES];
  const landingPhase = Math.max(landingStart, T.counterRepelled + 150);
  if (Number.isFinite(landingStart) && landingPhase < T.offEnd - 30) phases.push({from: landingPhase, text: 'Морские десанты на острова'});
  phases.push({from: T.offEnd, text: 'Сопротивление сломлено'});
  phases.sort((a, b) => a.from - b.from);

  const blueDead = world.blueUnits.filter((u) => frame >= u.death).length + world.counter.units.filter((u) => frame >= u.death).length;
  const blueTotal = world.blueUnits.length + world.counter.units.length;
  const deploy = smoothstep(T.deployStart, T.deployEnd, frame);
  const redTroops = (186400 - 21700 * Math.pow(share, 0.8)) * deploy;
  const blueTroops = 171200 * deploy * clamp01(1 - 0.55 * share - 0.45 * (blueDead / blueTotal));
  const blueDivs = Math.round((blueTotal - blueDead) * clamp01((frame - T.deployStart) / 70));
  const redDivs = Math.round((world.redUnits.length + world.landings.length * 2) * clamp01((frame - T.deployStart) / 70));

  const day = 1 + Math.floor(progressAt(frame) * 44);
  const hudIn = smoothstep(70, 105, frame);
  const defeated = smoothstep(T.offEnd, T.offEnd + 20, frame);

  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {/* верхняя плашка: день + фаза операции */}
      <div
        style={{
          ...panel,
          top: 26,
          left: '50%',
          transform: `translateX(-50%) translateY(${(1 - hudIn) * -30}px)`,
          opacity: hudIn,
          display: 'flex',
          alignItems: 'center',
          gap: 18,
          padding: '10px 26px 10px 12px',
          minWidth: 720,
        }}
      >
        <div
          style={{
            fontFamily: HEAD_FONT,
            fontSize: 22,
            background: '#b3201f',
            borderRadius: 9,
            padding: '6px 14px',
            letterSpacing: 1,
            whiteSpace: 'nowrap',
          }}
        >
          ДЕНЬ {day}
        </div>
        <div style={{position: 'relative', flex: 1, height: 34, overflow: 'hidden'}}>
          {phases.map((p, k) => {
            const next = phases[k + 1]?.from ?? Infinity;
            const tin = smoothstep(p.from, p.from + 12, frame);
            const tout = smoothstep(next, next + 12, frame);
            if (tin <= 0 || tout >= 1) return null;
            return (
              <div
                key={p.text}
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  fontFamily: HEAD_FONT,
                  fontSize: 26,
                  letterSpacing: 1,
                  whiteSpace: 'nowrap',
                  opacity: tin * (1 - tout),
                  transform: `translateY(${(1 - tin) * 24 - tout * 24}px)`,
                  color: p.text.startsWith('Контрудар синих') ? '#8fc0ff' : '#f4f6fa',
                }}
              >
                {p.text}
              </div>
            );
          })}
        </div>
      </div>

      <FactionCard
        side="left"
        name="КРАСНЫЕ"
        color="#ff4f3d"
        troops={redTroops}
        territory={redPct}
        divisions={redDivs}
        opacity={hudIn}
        defeated={0}
      />
      <FactionCard
        side="right"
        name="СИНИЕ"
        color="#4c9dff"
        troops={blueTroops}
        territory={100 - redPct}
        divisions={blueDivs}
        opacity={hudIn}
        defeated={defeated}
      />

      {/* нижняя полоса контроля территории */}
      <div
        style={{
          position: 'absolute',
          bottom: 30,
          left: '50%',
          width: 900,
          transform: `translateX(-50%) translateY(${(1 - hudIn) * 30}px)`,
          opacity: hudIn,
          fontFamily: BODY_FONT,
          color: '#e9eef6',
        }}
      >
        <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 20, marginBottom: 6, textShadow: '0 2px 6px #000'}}>
          <span style={{color: '#ff7a6b', fontWeight: 700}}>{redPct.toFixed(1)}%</span>
          <span style={{fontFamily: HEAD_FONT, letterSpacing: 2, opacity: 0.85}}>КОНТРОЛЬ ТЕРРИТОРИИ</span>
          <span style={{color: '#7fb6ff', fontWeight: 700}}>{(100 - redPct).toFixed(1)}%</span>
        </div>
        <div
          style={{
            position: 'relative',
            height: 16,
            borderRadius: 8,
            overflow: 'hidden',
            background: '#1e4d91',
            border: '1px solid rgba(255,255,255,0.35)',
            boxShadow: '0 6px 18px rgba(0,0,0,0.5)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: `${redPct}%`,
              background: 'linear-gradient(90deg, #8f1515, #e2382a)',
              boxShadow: '0 0 14px #ff5a3c',
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const Intro: React.FC<{frame: number}> = ({frame}) => {
  const o = 1 - smoothstep(62, 92, frame);
  if (o <= 0) return null;
  const tin = Easing.out(Easing.cubic)(clamp01(frame / 22));
  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', opacity: o, pointerEvents: 'none'}}>
      <div style={{textAlign: 'center', transform: `translateY(${(1 - tin) * 30 - (1 - o) * 40}px)`, opacity: tin}}>
        <div
          style={{
            fontFamily: HEAD_FONT,
            fontSize: 96,
            color: '#fff',
            letterSpacing: 6,
            textShadow: '0 6px 30px rgba(0,0,0,0.9), 0 0 2px #000',
          }}
        >
          ВОЙНА ЗА КОНТИНЕНТ
        </div>
        <div style={{fontFamily: HEAD_FONT, fontSize: 40, marginTop: 10, letterSpacing: 4, textShadow: '0 4px 20px #000'}}>
          <span style={{color: '#ff5a48'}}>КРАСНЫЕ</span>
          <span style={{color: '#cfd6e2', margin: '0 26px', fontSize: 32}}>против</span>
          <span style={{color: '#5aa6ff'}}>СИНИХ</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const Victory: React.FC<{frame: number}> = ({frame}) => {
  if (frame < T.victory) return null;
  const local = frame - T.victory;
  const s = spring({frame: local, fps: FPS, config: {damping: 12, stiffness: 120, mass: 0.9}});
  const bg = smoothstep(0, 25, local);
  const sub = smoothstep(18, 38, local);
  const flash = interpolate(local, [0, 3, 14], [0, 0.3, 0], {extrapolateRight: 'clamp'});
  const shine = (local * 14) % 1600;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at center, rgba(120,10,10,0.15) 0%, rgba(40,0,0,0.65) 75%)', opacity: bg}} />
      <AbsoluteFill style={{background: '#ffd9c9', opacity: flash}} />
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            padding: '34px 80px 30px',
            background: 'linear-gradient(180deg, rgba(60,6,6,0.92), rgba(25,4,4,0.92))',
            border: '3px solid #ff4f3d',
            borderRadius: 22,
            boxShadow: '0 0 60px rgba(255,60,40,0.55), 0 20px 60px rgba(0,0,0,0.6)',
            transform: `scale(${0.4 + 0.6 * s})`,
            opacity: clamp01(s * 1.5),
            textAlign: 'center',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: shine - 400,
              width: 160,
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)',
              transform: 'skewX(-20deg)',
            }}
          />
          <div style={{fontFamily: HEAD_FONT, fontSize: 34, letterSpacing: 10, color: '#ffb3a8'}}>★ ★ ★</div>
          <div
            style={{
              fontFamily: HEAD_FONT,
              fontSize: 118,
              lineHeight: 1.05,
              color: '#fff',
              letterSpacing: 8,
              textShadow: '0 0 30px #ff3b2b, 0 0 60px rgba(255,59,43,0.6)',
            }}
          >
            ПОБЕДА
          </div>
          <div style={{fontFamily: HEAD_FONT, fontSize: 64, letterSpacing: 14, color: '#ff5a48', marginTop: 4}}>КРАСНЫХ</div>
          <div
            style={{
              fontFamily: BODY_FONT,
              fontSize: 28,
              marginTop: 16,
              color: '#f2d6d1',
              opacity: sub,
              transform: `translateY(${(1 - sub) * 14}px)`,
              letterSpacing: 1,
            }}
          >
            100% территории континента под контролем красных
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
