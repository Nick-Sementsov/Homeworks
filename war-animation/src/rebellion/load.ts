import {staticFile} from 'remotion';
import {decode} from 'fast-png';
import {buildWar, type War} from './engine';

let cache: Promise<War> | null = null;

// Картинку декодируем тем же fast-png, что и scripts/sound.ts, — расчёт совпадает бит в бит.
export const loadWar = () => {
  if (!cache) {
    cache = fetch(staticFile('map.png'))
      .then((r) => r.arrayBuffer())
      .then((buf) => {
        const png = decode(buf);
        return buildWar(png.data, png.channels);
      });
  }
  return cache;
};
