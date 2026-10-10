import React from 'react';
import {Composition} from 'remotion';
import {DURATION, FPS, HEIGHT, WIDTH} from './timeline';
import {WarMap} from './WarMap';

export const RemotionRoot: React.FC = () => (
  <Composition id="WarMap" component={WarMap} durationInFrames={DURATION} fps={FPS} width={WIDTH} height={HEIGHT} />
);
