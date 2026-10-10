import {loadFont} from '@remotion/fonts';
import russoCyr from '@fontsource/russo-one/files/russo-one-cyrillic-400-normal.woff2';
import russoLat from '@fontsource/russo-one/files/russo-one-latin-400-normal.woff2';
import robotoCyr400 from '@fontsource/roboto-condensed/files/roboto-condensed-cyrillic-400-normal.woff2';
import robotoLat400 from '@fontsource/roboto-condensed/files/roboto-condensed-latin-400-normal.woff2';
import robotoCyr700 from '@fontsource/roboto-condensed/files/roboto-condensed-cyrillic-700-normal.woff2';
import robotoLat700 from '@fontsource/roboto-condensed/files/roboto-condensed-latin-700-normal.woff2';

// Шрифты лежат в node_modules (@fontsource), поэтому рендер не зависит от сети.
const CYR = 'U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116';
const LAT = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2122,U+2191,U+2193,U+2212,U+2215,U+2605,U+FEFF,U+FFFD';

export const HEAD_FONT = 'Russo One';
export const BODY_FONT = 'Roboto Condensed';

export const loadFonts = () =>
  Promise.all([
    loadFont({family: HEAD_FONT, url: russoCyr, unicodeRange: CYR, weight: '400'}),
    loadFont({family: HEAD_FONT, url: russoLat, unicodeRange: LAT, weight: '400'}),
    loadFont({family: BODY_FONT, url: robotoCyr400, unicodeRange: CYR, weight: '400'}),
    loadFont({family: BODY_FONT, url: robotoLat400, unicodeRange: LAT, weight: '400'}),
    loadFont({family: BODY_FONT, url: robotoCyr700, unicodeRange: CYR, weight: '700'}),
    loadFont({family: BODY_FONT, url: robotoLat700, unicodeRange: LAT, weight: '700'}),
  ]);
