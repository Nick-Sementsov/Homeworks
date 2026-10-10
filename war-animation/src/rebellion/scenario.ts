import type {Pt} from '../geometry';

// Сценарий второго ролика: красные наступают на синих, на юге красных
// поднимаются зелёные повстанцы, синие контратакуют — красные проигрывают.
// Все координаты — в пикселях исходной картинки (1536×1024).

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;
export const DURATION = 1380;

// Звуковая дорожка, которую генерирует scripts/sound.ts.
export const SOUNDTRACK = 'audio/rebellion.mp3';

export const RED = 1;
export const BLUE = 2;
export const GREEN = 3;

export type OpPlan = {
  id: string;
  side: number | number[]; // кто наступает (массив — каждый пиксель берёт ближайший)
  targets: number[]; // чью землю можно захватить
  start: number;
  end: number;
  mask: Pt[]; // район операции (края размываются шумом)
  soft?: number;
  arrows?: Pt[][];
  seed?: Pt; // точка восстания: фронт растёт из неё
  share?: number; // какую долю района успеют взять (1 — весь)
  mode?: 'area' | 'linear';
  naval?: boolean; // можно ли идти через море (острова)
  boost?: number; // насколько стрелки ускоряют продвижение
};

export const OPS: OpPlan[] = [
  // Красные бьют по синим тремя армиями.
  {
    id: 'R1',
    side: RED,
    targets: [BLUE],
    start: 90,
    end: 330,
    mask: [
      [600, 180],
      [1010, 200],
      [1050, 520],
      [990, 700],
      [940, 880],
      [640, 900],
    ],
    arrows: [
      [
        [690, 330],
        [790, 338],
        [880, 345],
        [960, 350],
      ],
      [
        [730, 505],
        [840, 512],
        [930, 518],
        [1005, 522],
      ],
      [
        [640, 745],
        [720, 752],
        [810, 762],
        [890, 770],
      ],
    ],
    share: 0.92,
  },
  // Восстание зелёных на юге красных — три очага один за другим.
  {
    id: 'G1a',
    side: GREEN,
    targets: [RED],
    start: 300,
    end: 500,
    seed: [470, 705],
    mask: [
      [370, 600],
      [585, 590],
      [600, 700],
      [585, 900],
      [370, 900],
    ],
    mode: 'linear',
    naval: true,
  },
  {
    id: 'G1b',
    side: GREEN,
    targets: [RED],
    start: 335,
    end: 530,
    seed: [330, 640],
    mask: [
      [230, 560],
      [415, 560],
      [415, 820],
      [230, 820],
    ],
    mode: 'linear',
  },
  {
    id: 'G1c',
    side: GREEN,
    targets: [RED],
    start: 365,
    end: 560,
    seed: [630, 785],
    mask: [
      [540, 600],
      [690, 610],
      [740, 720],
      [740, 870],
      [540, 880],
    ],
    mode: 'linear',
  },
  // Синие отбивают своё и заходят на землю красных.
  {
    id: 'B1',
    side: BLUE,
    targets: [RED],
    start: 410,
    end: 700,
    mask: [
      [630, 150],
      [1100, 150],
      [1120, 900],
      [700, 900],
      [620, 640],
      [610, 400],
    ],
    arrows: [
      [
        [1010, 350],
        [920, 345],
        [820, 335],
        [700, 322],
      ],
      [
        [1050, 522],
        [950, 520],
        [840, 512],
        [690, 500],
      ],
      [
        [960, 780],
        [870, 770],
        [790, 758],
        [720, 745],
      ],
    ],
    share: 0.96,
  },
  // Зелёные расширяются на север.
  {
    id: 'G2',
    side: GREEN,
    targets: [RED],
    start: 560,
    end: 820,
    mask: [
      [200, 390],
      [630, 400],
      [640, 620],
      [560, 600],
      [200, 600],
    ],
    arrows: [
      [
        [470, 640],
        [462, 560],
        [445, 470],
      ],
      [
        [330, 660],
        [300, 560],
        [275, 470],
      ],
    ],
    share: 0.9,
  },
  // Синие идут вглубь, к столице красных.
  {
    id: 'B2',
    side: BLUE,
    targets: [RED],
    start: 730,
    end: 1010,
    mask: [
      [300, 100],
      [660, 100],
      [640, 560],
      [440, 520],
      [300, 360],
    ],
    arrows: [
      [
        [660, 300],
        [580, 280],
        [490, 250],
        [410, 225],
      ],
      [
        [650, 470],
        [560, 460],
        [470, 440],
        [380, 420],
      ],
    ],
    share: 0.8,
  },
  {
    id: 'G3',
    side: GREEN,
    targets: [RED],
    start: 880,
    end: 1110,
    mask: [
      [120, 320],
      [470, 340],
      [500, 620],
      [120, 640],
    ],
    arrows: [
      [
        [445, 520],
        [400, 440],
        [330, 380],
      ],
      [
        [280, 520],
        [230, 460],
        [175, 400],
      ],
    ],
    naval: true,
  },
  {
    id: 'B3',
    side: BLUE,
    targets: [RED],
    start: 990,
    end: 1180,
    mask: [
      [100, 0],
      [700, 0],
      [700, 420],
      [420, 400],
      [100, 340],
    ],
    arrows: [
      [
        [430, 250],
        [370, 200],
        [310, 170],
      ],
      [
        [560, 230],
        [520, 150],
        [500, 70],
      ],
    ],
    naval: true,
  },
  // Добивание последних очагов красных — кто ближе, тот и берёт.
  {
    id: 'M',
    side: [BLUE, GREEN],
    targets: [RED],
    start: 1150,
    end: 1230,
    mask: [
      [0, 0],
      [1536, 0],
      [1536, 1024],
      [0, 1024],
    ],
    mode: 'linear',
    naval: true,
  },
];

export type ArmyPlan = {
  side: number;
  spawn: number;
  at: Pt; // где стоит (или куда выдвигается) в начале
  from?: Pt; // откуда выдвигается при появлении
  legs?: {op: string; arrow: number}[]; // по каким стрелкам идёт
  strength: [number, number][]; // численность: [кадр, бойцов]
};

const k = (...pairs: number[]): [number, number][] => {
  const out: [number, number][] = [];
  for (let i = 0; i < pairs.length; i += 2) out.push([pairs[i], pairs[i + 1]]);
  return out;
};

export const ARMIES: ArmyPlan[] = [
  // красные
  {side: RED, spawn: 30, from: [520, 320], at: [640, 328], legs: [{op: 'R1', arrow: 0}], strength: k(30, 0, 70, 18000, 330, 15400)},
  {side: RED, spawn: 34, from: [520, 505], at: [680, 505], legs: [{op: 'R1', arrow: 1}], strength: k(34, 0, 74, 22000, 330, 18600)},
  {side: RED, spawn: 38, from: [480, 730], at: [600, 742], legs: [{op: 'R1', arrow: 2}], strength: k(38, 0, 78, 14000, 330, 11900)},
  {side: RED, spawn: 40, at: [420, 650], strength: k(40, 0, 80, 6500)},
  {side: RED, spawn: 44, at: [600, 730], strength: k(44, 0, 84, 5200)},
  {side: RED, spawn: 48, at: [470, 450], strength: k(48, 0, 88, 16000, 600, 12500)},
  {side: RED, spawn: 50, at: [420, 230], strength: k(50, 0, 90, 9000)},
  {side: RED, spawn: 52, at: [260, 470], strength: k(52, 0, 92, 7000)},
  // синие
  {side: BLUE, spawn: 30, at: [860, 360], strength: k(30, 0, 70, 9500)},
  {side: BLUE, spawn: 32, at: [900, 520], strength: k(32, 0, 72, 11000)},
  {side: BLUE, spawn: 34, at: [850, 760], strength: k(34, 0, 74, 8000)},
  {
    side: BLUE,
    spawn: 36,
    from: [1180, 400],
    at: [1090, 380],
    legs: [
      {op: 'B1', arrow: 0},
      {op: 'B2', arrow: 0},
      {op: 'B3', arrow: 0},
    ],
    strength: k(36, 0, 76, 12000, 400, 19000, 700, 16500, 730, 21000, 1010, 17800, 1180, 16200),
  },
  {
    side: BLUE,
    spawn: 38,
    from: [1220, 560],
    at: [1110, 560],
    legs: [
      {op: 'B1', arrow: 1},
      {op: 'B2', arrow: 1},
    ],
    strength: k(38, 0, 78, 14000, 400, 23000, 700, 19800, 730, 24000, 1010, 20500),
  },
  {side: BLUE, spawn: 40, from: [1150, 760], at: [1060, 770], legs: [{op: 'B1', arrow: 2}], strength: k(40, 0, 80, 10000, 400, 15000, 700, 12600)},
  {side: BLUE, spawn: 960, from: [760, 300], at: [600, 250], legs: [{op: 'B3', arrow: 1}], strength: k(960, 0, 990, 9000, 1180, 8200)},
  // зелёные повстанцы
  {
    side: GREEN,
    spawn: 300,
    at: [470, 705],
    legs: [
      {op: 'G2', arrow: 0},
      {op: 'G3', arrow: 0},
    ],
    strength: k(300, 300, 420, 5200, 560, 7400, 820, 9800, 1110, 12000),
  },
  {
    side: GREEN,
    spawn: 335,
    at: [330, 640],
    legs: [
      {op: 'G2', arrow: 1},
      {op: 'G3', arrow: 1},
    ],
    strength: k(335, 200, 460, 3900, 560, 5600, 820, 7600, 1110, 9400),
  },
  {side: GREEN, spawn: 365, at: [630, 785], strength: k(365, 250, 480, 4300, 700, 6500)},
];

// Камера: [кадр, зум, центр x, центр y].
export const CAMERA: [number, number, number, number][] = [
  [0, 1.0, 768, 520],
  [90, 1.06, 800, 520],
  [250, 1.14, 840, 530],
  [330, 1.12, 620, 640],
  [470, 1.08, 700, 580],
  [650, 1.1, 640, 520],
  [800, 1.08, 520, 480],
  [1000, 1.1, 430, 390],
  [1200, 1.02, 600, 480],
  [DURATION, 0.98, 768, 512],
];
