import React from 'react';
import {Composition} from 'remotion';
import {Rebellion} from './rebellion/Rebellion';
import * as R from './rebellion/scenario';
import {DURATION, FPS, HEIGHT, WIDTH} from './timeline';
import {WarMap} from './WarMap';

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Rebellion" component={Rebellion} durationInFrames={R.DURATION} fps={R.FPS} width={R.WIDTH} height={R.HEIGHT} />
    <Composition id="WarMap" component={WarMap} durationInFrames={DURATION} fps={FPS} width={WIDTH} height={HEIGHT} />
  </>
);
