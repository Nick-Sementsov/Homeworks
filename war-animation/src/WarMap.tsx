import React, {useEffect, useState} from 'react';
import {AbsoluteFill, Easing, cancelRender, continueRender, delayRender, interpolate, useCurrentFrame} from 'remotion';
import {loadFonts} from './fonts';
import {Hud, Intro, Victory} from './Hud';
import {MapCanvas} from './MapCanvas';
import {Overlay} from './Overlay';
import {HEIGHT, T, WIDTH, smoothstep} from './timeline';
import {MAP_H, MAP_W, loadWorld, type World} from './world';

loadFonts();

// Карта и все расчёты фронта строятся один раз на вкладку браузера.
const useWorld = () => {
  const [world, setWorld] = useState<World | null>(null);
  const [handle] = useState(() => delayRender('Строим карту и фронт'));
  useEffect(() => {
    loadWorld()
      .then((w) => {
        setWorld(w);
        continueRender(handle);
      })
      .catch((e) => cancelRender(e));
  }, [handle]);
  return world;
};

// Камера: [кадр, зум, центр x, центр y] в координатах карты.
const CAMERA: [number, number, number, number][] = [
  [0, 1.2, 800, 520],
  [130, 1.0, 768, 525],
  [T.offStart, 1.02, 790, 525],
  [520, 1.12, 960, 545],
  [800, 1.1, 1030, 560],
  [T.offEnd, 1.04, 960, 545],
  [T.victory + 60, 0.96, 768, 520],
];

const camera = (frame: number) => {
  const fs = CAMERA.map((k) => k[0]);
  const opts = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.sin)} as const;
  return {
    zoom: interpolate(frame, fs, CAMERA.map((k) => k[1]), opts),
    cx: interpolate(frame, fs, CAMERA.map((k) => k[2]), opts),
    cy: interpolate(frame, fs, CAMERA.map((k) => k[3]), opts),
  };
};

export const WarMap: React.FC = () => {
  const frame = useCurrentFrame();
  const world = useWorld();
  const {zoom, cx, cy} = camera(frame);
  const hit = frame - T.counterRepelled;
  const shake = hit >= 0 && hit < 14 ? Math.sin(hit * 3.1) * (14 - hit) * 0.5 : 0;

  return (
    <AbsoluteFill style={{background: '#0f1319', overflow: 'hidden'}}>
      {world ? (
        <>
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: MAP_W,
              height: MAP_H,
              transformOrigin: '0 0',
              transform: `translate(${WIDTH / 2 + shake}px, ${HEIGHT / 2}px) scale(${zoom}) translate(${-cx}px, ${-cy}px)`,
              opacity: smoothstep(0, 18, frame),
            }}
          >
            <MapCanvas world={world} frame={frame} />
            <Overlay world={world} frame={frame} />
          </div>
          <AbsoluteFill
            style={{
              background: 'radial-gradient(ellipse at center, transparent 55%, rgba(5,7,11,0.75) 100%)',
              pointerEvents: 'none',
            }}
          />
          <Hud world={world} frame={frame} />
          <Intro frame={frame} />
          <Victory frame={frame} />
        </>
      ) : null}
    </AbsoluteFill>
  );
};
