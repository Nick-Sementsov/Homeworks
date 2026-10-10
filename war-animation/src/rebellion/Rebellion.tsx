import React, {useEffect, useState} from 'react';
import {AbsoluteFill, Html5Audio, cancelRender, continueRender, delayRender, getStaticFiles, staticFile, useCurrentFrame} from 'remotion';
import {loadFonts} from '../fonts';
import {MAP_H, MAP_W, type War, cameraAt, smoothstep} from './engine';
import {loadWar} from './load';
import {HEIGHT, SOUNDTRACK, WIDTH} from './scenario';
import {WarCanvas} from './WarCanvas';
import {WarOverlay} from './WarOverlay';

loadFonts();

const useWar = () => {
  const [war, setWar] = useState<War | null>(null);
  const [handle] = useState(() => delayRender('Строим карту и фронты', {timeoutInMilliseconds: 120000}));
  useEffect(() => {
    loadWar()
      .then((w) => {
        setWar(w);
        continueRender(handle);
      })
      .catch((e) => cancelRender(e));
  }, [handle]);
  return war;
};

export const Rebellion: React.FC = () => {
  const frame = useCurrentFrame();
  const war = useWar();
  const {zoom, cx, cy} = cameraAt(frame);
  const hasSound = getStaticFiles().some((f) => f.name === SOUNDTRACK);

  return (
    <AbsoluteFill style={{background: '#0f1319', overflow: 'hidden'}}>
      {hasSound ? <Html5Audio src={staticFile(SOUNDTRACK)} /> : null}
      {war ? (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: MAP_W,
            height: MAP_H,
            transformOrigin: '0 0',
            transform: `translate(${WIDTH / 2}px, ${HEIGHT / 2}px) scale(${zoom}) translate(${-cx}px, ${-cy}px)`,
            opacity: smoothstep(0, 20, frame),
          }}
        >
          <WarCanvas war={war} frame={frame} />
          <WarOverlay war={war} frame={frame} />
        </div>
      ) : null}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at center, transparent 55%, rgba(5,7,11,0.75) 100%)'}} />
    </AbsoluteFill>
  );
};
