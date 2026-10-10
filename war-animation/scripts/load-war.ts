import {readFileSync} from 'node:fs';
import path from 'node:path';
import {decode} from 'fast-png';
import {buildWar} from '../src/rebellion/engine';

// Та же сборка, что и в браузере, но с чтением картинки с диска.
export const loadWarFromDisk = () => {
  const png = decode(readFileSync(path.resolve(__dirname, '../public/map.png')));
  return buildWar(png.data, png.channels);
};
