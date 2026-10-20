import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, GROUND_TOP, WORLD_WIDTH } from '../../config';
import { FELIX_GARDEN, FENCE_TOP, IVY, PERGOLAS, PERGOLA_TOP, type BackTreeKind, type BushKind, type HouseKind } from '../../data/backdrop';

// Platzhalter-Zeichnungen für den Hintergrund (#63): rote Backsteinhäuser, Bäume, Zaun, Wiese.
// Alles wird einmal beim Start in Texturen gezeichnet (flüssig auf dem Tablet). Echte Grafiken
// kommen unter denselben Keys; Fenster und Schornsteine stehen dann in HOUSE_SPECS anzupassen.

type G = Phaser.GameObjects.Graphics;
const v = (x: number, y: number) => new Phaser.Math.Vector2(x, y);

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface HouseSpec {
  width: number;
  height: number;
  /** Fensterscheiben (Texturkoordinaten), nachts gehen dort Lichter an. */
  windows: Rect[];
  /** Oberes Ende der Schornsteine (für Rauch). */
  chimneys: { x: number; y: number }[];
  /** Waagerechter Dachfirst (Texturkoordinaten), dort laufen manchmal Katzen entlang. */
  ridge?: { y: number; left: number; right: number };
  draw(g: G): void;
  /** Schnee auf Dach, Schornsteinen und Fensterbänken (gleiche Fläche). */
  drawSnow(g: G): void;
}

/** Zaun und Wiese werden in Kacheln von Bildschirmbreite gezeichnet (Textur-Größenlimit). */
export const TILE_COUNT = Math.ceil(WORLD_WIDTH / GAME_WIDTH);
/** Oberkante der Zaun-Kacheln (Schnee auf den Pfosten) und Unterkante (Bodendecker vor dem Zaun). */
export const FENCE_TILE_TOP = FENCE_TOP - 30;
export const FENCE_TILE_HEIGHT = GROUND_TOP + 26 - FENCE_TILE_TOP;
export const MEADOW_TILE_HEIGHT = GAME_HEIGHT - GROUND_TOP;

// --- Farben ------------------------------------------------------------------

const BRICKS = [0xb4533c, 0xa84a35, 0xbc5c43];
const JOINT = 0xd89a82;
const ROOF = 0x8a3a28;
const ROOF_LINE = 0x70301f;
const ROOF_DARK = 0x5e2618;
const FRAME = 0xf5f3ee;
const GLASS = 0x5b7389;
const GLASS_HI = 0x9ab4c8;
const SILL = 0xd9d4ca;
const SNOW = 0xf7fbff;
const SNOW_SHADE = 0xdbe6f3;

/** Immer gleiche Zufallsfolge (alle Kacheln sehen dieselbe Welt). */
export function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- Bausteine der Häuser ---------------------------------------------------

/** Backsteinwand: Fläche mit angedeuteten Fugen. width(y) begrenzt die Fugen (z. B. im Giebel). */
function brickRows(g: G, x: number, y: number, w: number, h: number, span?: (y: number) => [number, number]): void {
  g.lineStyle(1, JOINT, 0.35);
  let row = 0;
  for (let yy = y + 8; yy < y + h; yy += 8, row++) {
    const [a, b] = span ? span(yy) : [x, x + w];
    if (b - a < 4) continue;
    g.lineBetween(a, yy, b, yy);
    for (let xx = a + (row % 2 ? 9 : 0); xx < b; xx += 18) g.lineBetween(xx, yy - 8, xx, yy);
  }
}

function brickWall(g: G, x: number, y: number, w: number, h: number, color: number): void {
  g.fillStyle(color);
  g.fillRect(x, y, w, h);
  brickRows(g, x, y, w, h);
}

/** Weißes Sprossenfenster mit Sturz und Fensterbank. */
function window_(g: G, r: Rect): void {
  g.fillStyle(0x8e3b29);
  g.fillRect(r.x - 4, r.y - 8, r.w + 8, 8);
  g.fillStyle(FRAME);
  g.fillRect(r.x, r.y, r.w, r.h);
  const p = glass(r);
  g.fillStyle(GLASS);
  g.fillRect(p.x, p.y, p.w, p.h);
  g.fillStyle(GLASS_HI, 0.45);
  g.fillTriangle(p.x, p.y, p.x + p.w * 0.6, p.y, p.x, p.y + p.h * 0.5);
  // Sprossen: senkrecht in der Mitte, waagerecht bei 40 %
  g.fillStyle(FRAME);
  g.fillRect(r.x + r.w / 2 - 2, r.y, 4, r.h);
  g.fillRect(r.x, r.y + r.h * 0.4 - 2, r.w, 4);
  g.fillStyle(SILL);
  g.fillRect(r.x - 5, r.y + r.h, r.w + 10, 6);
}

/** Scheibenfläche eines Fensters (ohne Rahmen). */
function glass(r: Rect): Rect {
  return { x: r.x + 5, y: r.y + 5, w: r.w - 10, h: r.h - 10 };
}

function windowSnow(g: G, r: Rect): void {
  g.fillStyle(SNOW);
  g.fillRoundedRect(r.x - 6, r.y + r.h - 3, r.w + 12, 7, 3);
}

function chimney(g: G, x: number, top: number, bottom: number): void {
  g.fillStyle(0x9c4431);
  g.fillRect(x, top + 8, 30, bottom - top - 8);
  brickRows(g, x, top + 8, 30, bottom - top - 8);
  g.fillStyle(0x5b5b5b);
  g.fillRect(x - 4, top, 38, 10);
}

function chimneySnow(g: G, x: number, top: number): void {
  g.fillStyle(SNOW);
  g.fillRoundedRect(x - 5, top - 6, 40, 10, 5);
}

/** Satteldach von vorn gesehen (Trapez) mit Ziegelreihen, Firstlinie und Regenrinne. */
function roof(g: G, eaveY: number, eaveL: number, eaveR: number, ridgeY: number, ridgeL: number, ridgeR: number): void {
  g.fillStyle(ROOF);
  g.fillPoints([v(ridgeL, ridgeY), v(ridgeR, ridgeY), v(eaveR, eaveY), v(eaveL, eaveY)], true);
  const span = (y: number): [number, number] => {
    const t = (y - ridgeY) / (eaveY - ridgeY);
    return [ridgeL + (eaveL - ridgeL) * t, ridgeR + (eaveR - ridgeR) * t];
  };
  g.lineStyle(2, ROOF_LINE, 0.9);
  let row = 0;
  for (let y = ridgeY + 13; y < eaveY; y += 13, row++) {
    const [a, b] = span(y);
    g.lineBetween(a, y, b, y);
    // Ziegelkanten versetzt
    g.lineStyle(1, ROOF_LINE, 0.5);
    for (let x = a + (row % 2 ? 11 : 0); x < b; x += 22) g.lineBetween(x, y - 13, x, y);
    g.lineStyle(2, ROOF_LINE, 0.9);
  }
  g.lineStyle(6, ROOF_DARK);
  g.lineBetween(ridgeL, ridgeY, ridgeR, ridgeY);
  g.fillStyle(0x6b6b6b);
  g.fillRect(eaveL - 4, eaveY - 4, eaveR - eaveL + 8, 8);
}

function roofSnow(g: G, eaveY: number, eaveL: number, eaveR: number, ridgeY: number, ridgeL: number, ridgeR: number): void {
  // Schnee bedeckt das Dach bis kurz vor die Rinne, mit weicher Unterkante
  const low = eaveY - 12;
  const t = (low - ridgeY) / (eaveY - ridgeY);
  const l = ridgeL + (eaveL - ridgeL) * t;
  const r = ridgeR + (eaveR - ridgeR) * t;
  g.fillStyle(SNOW);
  g.fillPoints([v(ridgeL - 2, ridgeY - 6), v(ridgeR + 2, ridgeY - 6), v(r, low), v(l, low)], true);
  for (let x = l + 10; x < r; x += 26) g.fillCircle(x, low, 8);
  g.fillStyle(SNOW_SHADE);
  g.fillRect(ridgeL, ridgeY + 16, ridgeR - ridgeL, 4);
}

/** Gaube: kleines Dachhäuschen mit Fenster und Satteldach. */
function dormer(g: G, cx: number, bottom: number, w: number): Rect {
  const top = bottom - 64;
  brickWall(g, cx - w / 2, top, w, 64, BRICKS[1]);
  const win = { x: cx - 24, y: top + 12, w: 48, h: 42 };
  window_(g, win);
  g.fillStyle(ROOF);
  g.fillTriangle(cx - w / 2 - 12, top + 4, cx + w / 2 + 12, top + 4, cx, top - 30);
  g.lineStyle(5, ROOF_DARK);
  g.lineBetween(cx - w / 2 - 12, top + 4, cx, top - 30);
  g.lineBetween(cx, top - 30, cx + w / 2 + 12, top + 4);
  return win;
}

function dormerSnow(g: G, cx: number, bottom: number, w: number): void {
  const top = bottom - 64;
  g.lineStyle(9, SNOW);
  g.lineBetween(cx - w / 2 - 12, top, cx, top - 35);
  g.lineBetween(cx, top - 35, cx + w / 2 + 12, top);
  windowSnow(g, { x: cx - 24, y: top + 12, w: 48, h: 42 });
}

// --- Die Häuser ---------------------------------------------------------------

/** Schmales Haus mit spitzem, steilem Giebel zur Wiese, oben ein kleines Fenster. */
const GABLE: HouseSpec = (() => {
  const apex = { x: 190, y: 36 };
  const eave = 222;
  const left = 60;
  const right = 320;
  const windows: Rect[] = [
    { x: 172, y: 112, w: 36, h: 46 },
    { x: 96, y: 250, w: 62, h: 84 },
    { x: 222, y: 250, w: 62, h: 84 },
    { x: 88, y: 366, w: 78, h: 80 },
    { x: 214, y: 366, w: 78, h: 80 },
  ];
  return {
    width: 380,
    height: 460,
    windows: windows.map(glass),
    chimneys: [{ x: 283, y: 50 }],
    draw: (g) => {
      chimney(g, 268, 50, 150);
      g.fillStyle(BRICKS[0]);
      g.fillPoints([v(left, 460), v(left, eave), v(apex.x, apex.y), v(right, eave), v(right, 460)], true);
      brickRows(g, left, apex.y, right - left, 460 - apex.y, (y) => {
        if (y >= eave) return [left, right];
        const half = ((y - apex.y) / (eave - apex.y)) * (apex.x - left);
        return [apex.x - half + 3, apex.x + half - 3];
      });
      // Dachkanten (Ortgang) mit Überstand
      g.lineStyle(24, ROOF);
      g.lineBetween(apex.x, apex.y - 14, 34, eave + 20);
      g.lineBetween(apex.x, apex.y - 14, 346, eave + 20);
      g.fillStyle(ROOF);
      g.fillCircle(apex.x, apex.y - 14, 12);
      g.lineStyle(3, ROOF_DARK);
      g.lineBetween(apex.x, apex.y - 26, 26, eave + 12);
      g.lineBetween(apex.x, apex.y - 26, 354, eave + 12);
      // Gesims zwischen den Geschossen
      g.fillStyle(0x93402d);
      g.fillRect(left, 350, right - left, 6);
      windows.forEach((w) => window_(g, w));
    },
    drawSnow: (g) => {
      g.lineStyle(10, SNOW);
      g.lineBetween(apex.x, apex.y - 28, 28, eave + 8);
      g.lineBetween(apex.x, apex.y - 28, 352, eave + 8);
      g.fillStyle(SNOW);
      g.fillCircle(apex.x, apex.y - 28, 6);
      chimneySnow(g, 268, 50);
      windows.forEach((w) => windowSnow(g, w));
    },
  };
})();

/** Lange Häuserreihe mit durchgehendem Dach, Gauben und zwei Schornsteinen. */
const ROW: HouseSpec = (() => {
  const eave = 176;
  const dormers = [130, 380, 630];
  const floor1 = [40, 150, 300, 410, 560, 670].map((x) => ({ x, y: 200, w: 56, h: 76 }));
  const floor0 = [30, 142, 290, 402, 552, 662].map((x) => ({ x, y: 300, w: 70, h: 70 }));
  const dormerWindows = dormers.map((cx) => ({ x: cx - 24, y: 150 - 64 + 12, w: 48, h: 42 }));
  return {
    width: 760,
    ridge: { y: 52, left: 70, right: 690 },
    height: 380,
    windows: [...floor1, ...floor0, ...dormerWindows].map(glass),
    chimneys: [
      { x: 255, y: 10 },
      { x: 575, y: 16 },
    ],
    draw: (g) => {
      ([[0, 250], [250, 260], [510, 250]] as const).forEach(([x, w], i) => brickWall(g, x, eave, w, 380 - eave, BRICKS[i]));
      g.fillStyle(0x8e3f2d);
      g.fillRect(248, eave, 4, 380 - eave);
      g.fillRect(508, eave, 4, 380 - eave);
      roof(g, eave, 4, 756, 52, 70, 690);
      chimney(g, 240, 10, 80);
      chimney(g, 560, 16, 70);
      dormers.forEach((cx) => dormer(g, cx, 150, 96));
      [...floor1, ...floor0].forEach((w) => window_(g, w));
    },
    drawSnow: (g) => {
      roofSnow(g, eave, 4, 756, 52, 70, 690);
      dormers.forEach((cx) => dormerSnow(g, cx, 150, 96));
      chimneySnow(g, 240, 10);
      chimneySnow(g, 560, 16);
      [...floor1, ...floor0].forEach((w) => windowSnow(g, w));
    },
  };
})();

/** Haus mit Solarmodulen auf dem Dach. */
const SOLAR: HouseSpec = (() => {
  const eave = 166;
  const floor1 = [50, 180, 320, 450].map((x) => ({ x, y: 188, w: 58, h: 76 }));
  const floor0 = [44, 174, 314, 444].map((x) => ({ x, y: 286, w: 72, h: 62 }));
  return {
    width: 560,
    ridge: { y: 42, left: 90, right: 470 },
    height: 360,
    windows: [...floor1, ...floor0].map(glass),
    chimneys: [{ x: 125, y: 4 }],
    draw: (g) => {
      brickWall(g, 0, eave, 560, 360 - eave, BRICKS[2]);
      roof(g, eave, 6, 554, 42, 90, 470);
      // Solarmodule (2 Reihen × 5)
      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 5; col++) {
          const x = 170 + col * 54 - row * 8;
          const y = 66 + row * 40;
          g.fillStyle(0xc0c6cc);
          g.fillRect(x - 2, y - 2, 52 + row * 4, 36);
          g.fillStyle(0x1f3552);
          g.fillRect(x, y, 48 + row * 4, 32);
          g.lineStyle(1, 0x4a6a92, 0.9);
          for (let i = 1; i < 4; i++) g.lineBetween(x + (i * (48 + row * 4)) / 4, y, x + (i * (48 + row * 4)) / 4, y + 32);
          g.lineBetween(x, y + 16, x + 48 + row * 4, y + 16);
        }
      }
      chimney(g, 110, 4, 60);
      [...floor1, ...floor0].forEach((w) => window_(g, w));
    },
    drawSnow: (g) => {
      roofSnow(g, eave, 6, 554, 42, 90, 470);
      chimneySnow(g, 110, 4);
      [...floor1, ...floor0].forEach((w) => windowSnow(g, w));
    },
  };
})();

/** Kleineres Haus mit einer Gaube, Haustür und einem Schornstein. */
const SMALL: HouseSpec = (() => {
  const eave = 156;
  const floor1 = [40, 170, 300].map((x) => ({ x, y: 178, w: 58, h: 72 }));
  const floor0 = [34, 304].map((x) => ({ x, y: 268, w: 70, h: 56 }));
  const dormerWindow = { x: 210 - 24, y: 132 - 64 + 12, w: 48, h: 42 };
  return {
    width: 420,
    ridge: { y: 50, left: 80, right: 340 },
    height: 330,
    windows: [...floor1, ...floor0, dormerWindow].map(glass),
    chimneys: [{ x: 335, y: 12 }],
    draw: (g) => {
      brickWall(g, 0, eave, 420, 330 - eave, BRICKS[1]);
      roof(g, eave, 4, 416, 50, 80, 340);
      chimney(g, 320, 12, 70);
      dormer(g, 210, 132, 110);
      [...floor1, ...floor0].forEach((w) => window_(g, w));
      // Haustür mit Oberlicht
      g.fillStyle(0x8e3b29);
      g.fillRect(172, 256, 76, 8);
      g.fillStyle(FRAME);
      g.fillRect(176, 264, 68, 66);
      g.fillStyle(0x2e5e4e);
      g.fillRect(182, 270, 56, 60);
      g.fillStyle(0xe9c46a);
      g.fillCircle(228, 302, 3);
    },
    drawSnow: (g) => {
      roofSnow(g, eave, 4, 416, 50, 80, 340);
      dormerSnow(g, 210, 132, 110);
      chimneySnow(g, 320, 12);
      [...floor1, ...floor0].forEach((w) => windowSnow(g, w));
    },
  };
})();

/** Schmaler, dunkelgrüner Nadelbaum in Säulenform zwischen den Häusern. */
const CYPRESS: HouseSpec = {
  width: 90,
  height: 340,
  windows: [],
  chimneys: [],
  draw: (g) => {
    g.fillStyle(0x1f4a33);
    g.fillEllipse(45, 190, 76, 300);
    g.fillTriangle(45, 0, 22, 80, 68, 80);
    g.fillStyle(0x2d6446);
    for (let i = 0; i < 9; i++) g.fillEllipse(34 + (i % 3) * 11, 60 + i * 30, 14, 34);
  },
  drawSnow: (g) => {
    g.fillStyle(SNOW);
    g.fillTriangle(45, 2, 34, 36, 56, 36);
    for (let i = 0; i < 5; i++) g.fillEllipse(30 + (i % 2) * 28, 90 + i * 50, 18, 7);
  },
};

export const HOUSE_SPECS: Record<HouseKind, HouseSpec> = {
  gable: GABLE,
  row: ROW,
  solar: SOLAR,
  small: SMALL,
  cypress: CYPRESS,
};

export const houseKey = (kind: HouseKind) => (kind === 'cypress' ? 'bg-cypress' : `house-${kind}`);

// --- Bäume hinter dem Zaun ------------------------------------------------

export const BACK_TREE_SIZE: Record<BackTreeKind, { width: number; height: number }> = {
  fir: { width: 260, height: 480 },
  tree: { width: 400, height: 430 },
};

export function drawBackTree(g: G, kind: BackTreeKind): void {
  if (kind === 'fir') {
    // Dunkle Tanne: Stufen von oben nach unten breiter
    g.fillStyle(0x4a3a2c);
    g.fillRect(120, 380, 20, 100);
    for (let i = 0; i < 7; i++) {
      const top = i * 54;
      const half = 34 + i * 16;
      g.fillStyle(0x1d4a36);
      g.fillTriangle(130, top, 130 - half, top + 110, 130 + half, top + 110);
      g.fillStyle(0x2a5e45);
      g.fillTriangle(130 - half, top + 110, 130 - half + 30, top + 100, 130, top + 108);
    }
    return;
  }
  // Laubbaum mit gedämpftem Grün und ein paar gelben Blättern
  g.fillStyle(0x6a5a4a);
  g.fillPoints([v(186, 430), v(214, 430), v(208, 250), v(192, 250)], true);
  g.lineStyle(10, 0x6a5a4a);
  g.lineBetween(200, 280, 130, 190);
  g.lineBetween(200, 270, 280, 180);
  const r = rng(7);
  const greens = [0x3f7a40, 0x4f8a4a, 0x5f9a52];
  for (let i = 0; i < 26; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * 120;
    g.fillStyle(greens[i % 3]);
    g.fillCircle(200 + Math.cos(a) * d * 1.25, 170 + Math.sin(a) * d * 0.9, 40 + r() * 24);
  }
  g.fillStyle(0xc9b458);
  for (let i = 0; i < 8; i++) g.fillCircle(90 + r() * 220, 80 + r() * 180, 7);
}

// --- Büsche vor dem Zaun ---------------------------------------------------------

export const BUSH_SIZE = { width: 220, height: 120 };

const BUSH_COLORS: Record<BushKind, number[]> = {
  green: [0x3f7d3a, 0x4f9444, 0x5fa650],
  dark: [0x2c5e33, 0x356c3a, 0x417c42],
  red: [0x9c2f23, 0xc0392b, 0xd9583f],
  orange: [0xc4661f, 0xe07b2a, 0xf0a04b],
};

export function drawBush(g: G, kind: BushKind): void {
  const [dark, mid, light] = BUSH_COLORS[kind];
  const r = rng(kind.length * 31 + 5);
  g.fillStyle(dark);
  g.fillEllipse(110, 86, 210, 68);
  for (let i = 0; i < 14; i++) {
    g.fillStyle(i < 7 ? mid : light);
    const x = 30 + r() * 160;
    const y = 40 + r() * 40 + (i < 7 ? 20 : 0);
    g.fillCircle(x, y, 22 + r() * 16);
  }
  // Einzelne Blätter am Rand
  g.fillStyle(light);
  for (let i = 0; i < 18; i++) g.fillCircle(14 + r() * 192, 22 + r() * 70, 5);
}

// --- Zaun, Efeu und Pergola (Weltkoordinaten) ----------------------------------------

const POST_STEP = 240;
const IVY_COLORS = [0x2e6b3a, 0x3c8446, 0x4f9a52, 0x285c33];

/** Efeublatt (zwei Rundungen und eine Spitze), selten ein rotes vom wilden Wein. */
function ivyLeaf(g: G, r: () => number, x: number, y: number, s: number): void {
  g.fillStyle(r() < 0.03 ? 0xb8432f : IVY_COLORS[Math.floor(r() * IVY_COLORS.length)]);
  g.fillCircle(x - s * 0.45, y, s * 0.6);
  g.fillCircle(x + s * 0.45, y, s * 0.6);
  g.fillTriangle(x - s, y + s * 0.1, x + s, y + s * 0.1, x, y + s * 1.1);
}

/** Zeichnet den Zaun der ganzen Welt verschoben um (ox, oy) – für eine Kachel. */
export function drawFence(g: G, ox: number, oy: number): void {
  g.save();
  g.translateCanvas(-ox, -oy);
  const r = rng(63);

  // Sichtschutzzaun aus waagerechten Latten, verwittert graubraun, in Feldern
  g.fillStyle(0x5e5347);
  g.fillRect(0, FENCE_TOP, WORLD_WIDTH, GROUND_TOP - FENCE_TOP);
  const slats = [0x8e8174, 0x978a7c, 0x857869, 0x9a8f83];
  for (let px = 0; px < WORLD_WIDTH; px += POST_STEP) {
    for (let y = FENCE_TOP; y < GROUND_TOP; y += 14) {
      g.fillStyle(slats[Math.floor(r() * slats.length)]);
      g.fillRect(px, y, POST_STEP, 12);
      // Maserung
      g.lineStyle(1, 0x6f6357, 0.45);
      const gx = px + 10 + r() * (POST_STEP - 80);
      g.lineBetween(gx, y + 4 + r() * 4, gx + 30 + r() * 60, y + 4 + r() * 4);
    }
  }
  for (let px = 0; px <= WORLD_WIDTH; px += POST_STEP) {
    g.fillStyle(0x6b5c4e);
    g.fillRect(px - 9, FENCE_TOP - 10, 18, GROUND_TOP - FENCE_TOP + 10);
    g.fillStyle(0x5a4c40);
    g.fillRect(px - 12, FENCE_TOP - 14, 24, 8);
  }

  // Efeu und Kletterpflanzen am Zaun: unten dicht, nach oben und zu den Rändern lichter
  for (const [a, b] of IVY) {
    const count = Math.round((b - a) * 1.4);
    for (let i = 0; i < count; i++) {
      const x = a + r() * (b - a);
      const edge = Math.min(x - a, b - x) / 120;
      if (r() > Math.min(1, edge + 0.15)) continue;
      const h = Math.pow(r(), 1.6) * (GROUND_TOP - FENCE_TOP);
      ivyLeaf(g, r, x, GROUND_TOP - 8 - h, 6 + r() * 5);
    }
  }

  // Streifen niedriger Bodendecker vor dem Zaun
  const ground = [0x3f7d3a, 0x4d8f42, 0x5a9e4c];
  for (let x = 0; x < WORLD_WIDTH; x += 9) {
    g.fillStyle(ground[Math.floor(r() * ground.length)]);
    g.fillCircle(x + r() * 8, GROUND_TOP + 4 + r() * 12, 8 + r() * 6);
  }
  g.restore();
}

/** Schnee auf Zaun und Pfosten (gleiche Kachelung wie der Zaun). */
export function drawFenceSnow(g: G, ox: number, oy: number): void {
  g.save();
  g.translateCanvas(-ox, -oy);
  g.fillStyle(SNOW);
  g.fillRect(0, FENCE_TOP - 6, WORLD_WIDTH, 8);
  for (let x = 0; x < WORLD_WIDTH; x += 22) g.fillCircle(x + ((x * 7) % 11), FENCE_TOP - 3, 6);
  for (let px = 0; px <= WORLD_WIDTH; px += POST_STEP) g.fillRoundedRect(px - 14, FENCE_TOP - 22, 28, 10, 5);
  g.restore();
}

/** Fläche eines Pergola-Bildes in Weltkoordinaten (nur dort, wo es eine Pergola gibt). */
export function pergolaArea(index: number): Rect {
  const [a, b] = PERGOLAS[index];
  const y = PERGOLA_TOP - 30;
  return { x: a - 60, y, w: b - a + 120, h: GROUND_TOP + 4 - y };
}

function pergolaPosts(a: number, b: number): number[] {
  const n = Math.max(1, Math.round((b - a) / 300));
  return Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);
}

/** Pergola aus Holzbalken über dem Zaun: Pfosten, Querbalken obendrauf, Efeu daran. */
export function drawPergola(g: G, index: number): void {
  const [a, b] = PERGOLAS[index];
  const area = pergolaArea(index);
  g.save();
  g.translateCanvas(-area.x, -area.y);
  const r = rng(640 + index);
  for (const x of pergolaPosts(a, b)) {
    g.fillStyle(0x8a6b4d);
    g.fillRect(x - 10, PERGOLA_TOP, 20, GROUND_TOP - PERGOLA_TOP);
    g.fillStyle(0x6e5238);
    g.fillRect(x + 4, PERGOLA_TOP, 6, GROUND_TOP - PERGOLA_TOP);
  }
  g.fillStyle(0x8a6b4d);
  g.fillRect(a - 40, PERGOLA_TOP, b - a + 80, 22);
  g.fillStyle(0x6e5238);
  g.fillRect(a - 40, PERGOLA_TOP + 16, b - a + 80, 6);
  // Querbalken von vorn (Stirnseiten)
  for (let x = a - 20; x <= b + 20; x += 56) {
    g.fillStyle(0x7a5c40);
    g.fillRect(x - 7, PERGOLA_TOP - 16, 14, 46);
    g.fillStyle(0x94765a);
    g.fillRect(x - 7, PERGOLA_TOP - 16, 14, 5);
  }

  // Wo Efeu wächst: an den Pfosten hoch, am Balken entlang, mit herabhängenden Trieben
  for (const [ia, ib] of IVY) {
    const from = Math.max(ia, a - 40);
    const to = Math.min(ib, b + 40);
    if (from >= to) continue;
    for (const x of pergolaPosts(a, b)) {
      if (x < from - 10 || x > to + 10) continue;
      for (let y = GROUND_TOP - 10; y > PERGOLA_TOP; y -= 9) ivyLeaf(g, r, x + (r() - 0.5) * 26, y, 6 + r() * 4);
    }
    for (let x = from; x < to; x += 7) ivyLeaf(g, r, x, PERGOLA_TOP + 4 + (r() - 0.5) * 22, 6 + r() * 4);
    for (let x = from + 20; x < to; x += 40 + r() * 50) {
      const len = 30 + r() * 70;
      g.lineStyle(2, 0x2e6b3a);
      g.lineBetween(x, PERGOLA_TOP + 20, x + 4, PERGOLA_TOP + 20 + len);
      for (let y = PERGOLA_TOP + 26; y < PERGOLA_TOP + 20 + len; y += 12) ivyLeaf(g, r, x + (r() - 0.5) * 10, y, 5 + r() * 3);
    }
  }
  g.restore();
}

export function drawPergolaSnow(g: G, index: number): void {
  const [a, b] = PERGOLAS[index];
  const area = pergolaArea(index);
  g.save();
  g.translateCanvas(-area.x, -area.y);
  g.fillStyle(SNOW);
  g.fillRoundedRect(a - 42, PERGOLA_TOP - 7, b - a + 84, 9, 4);
  for (let x = a - 20; x <= b + 20; x += 56) g.fillRoundedRect(x - 9, PERGOLA_TOP - 24, 18, 9, 4);
  g.restore();
}

// --- Wiese ---------------------------------------------------------------------

/** Kräftig grüner Rasen mit helleren, trockenen Flecken (Weltkoordinaten, in Kacheln). */
export function drawMeadow(g: G, ox: number, oy: number): void {
  g.save();
  g.translateCanvas(-ox, -oy);
  const r = rng(1063);
  const h = GAME_HEIGHT - GROUND_TOP;
  g.fillStyle(0x6cbf55);
  g.fillRect(0, GROUND_TOP, WORLD_WIDTH, h);
  g.fillStyle(0x5fae4b);
  g.fillRect(0, GROUND_TOP, WORLD_WIDTH, 26);

  // Trockene Flecken: vorne größer, hinten flacher (Perspektive)
  for (let i = 0; i < 7 * TILE_COUNT; i++) {
    const cx = r() * WORLD_WIDTH;
    const cy = GROUND_TOP + 50 + r() * (h - 80);
    const depth = (cy - GROUND_TOP) / h;
    const w = 90 + r() * 150 * (0.6 + depth);
    const hh = w * (0.18 + depth * 0.12);
    g.fillStyle(0xa3bf66, 0.75);
    for (let k = 0; k < 3; k++) g.fillEllipse(cx + (r() - 0.5) * w * 0.6, cy + (r() - 0.5) * hh * 0.5, w * (0.6 + r() * 0.4), hh * (0.7 + r() * 0.4));
    g.fillStyle(0xbccb84, 0.55);
    g.fillEllipse(cx, cy, w * 0.45, hh * 0.5);
  }

  // Grasbüschel
  for (let i = 0; i < 420 * TILE_COUNT; i++) {
    const x = r() * WORLD_WIDTH;
    const y = GROUND_TOP + 30 + r() * (h - 30);
    const s = 4 + ((y - GROUND_TOP) / h) * 6;
    g.lineStyle(2, r() < 0.5 ? 0x58a844 : 0x86d06a, 0.9);
    g.lineBetween(x, y, x - s * 0.5, y - s);
    g.lineBetween(x, y, x + s * 0.4, y - s * 1.1);
  }

  // Ein paar Gänseblümchen
  const colors = [0xffffff, 0xffffff, 0xffd6e0, 0xfff3b0];
  for (let i = 0; i < 16 * TILE_COUNT; i++) {
    const x = r() * WORLD_WIDTH;
    const y = GROUND_TOP + 50 + r() * (h - 70);
    g.fillStyle(colors[i % colors.length]);
    g.fillCircle(x, y, 5);
    g.fillStyle(0xffd166);
    g.fillCircle(x, y, 2);
  }

  drawMulch(g, r);
  g.restore();
}

/** Felix' Garten (#64): Erde und Rindenmulch mit Herbstlaub statt Rasen, Rand ausgefranst. */
function drawMulch(g: G, r: () => number): void {
  const from = FELIX_GARDEN.mulchFrom;
  const h = GAME_HEIGHT - GROUND_TOP;
  const edge: Phaser.Math.Vector2[] = [];
  for (let y = GROUND_TOP; y <= GAME_HEIGHT; y += 20) edge.push(v(from + Math.sin(y / 37) * 26 + (r() - 0.5) * 24, y));
  g.fillStyle(0x6b4f3a);
  g.fillPoints([...edge, v(WORLD_WIDTH, GAME_HEIGHT), v(WORLD_WIDTH, GROUND_TOP)], true);
  // Rindenstücke
  const bark = [0x8a6446, 0x5a3f2c, 0x7a5a40, 0x9c7652, 0x4e3726];
  for (let i = 0; i < 2600; i++) {
    const x = from + 10 + r() * (WORLD_WIDTH - from);
    const y = GROUND_TOP + r() * h;
    const s = 0.6 + ((y - GROUND_TOP) / h) * 0.8;
    g.fillStyle(bark[Math.floor(r() * bark.length)]);
    g.fillEllipse(x, y, (8 + r() * 8) * s, (3 + r() * 3) * s);
  }
  // Herbstlaub
  const leaves = [0xd9822b, 0xc0392b, 0xe3b53a, 0xb5651d];
  for (let i = 0; i < 220; i++) {
    const x = from + 20 + r() * (WORLD_WIDTH - from);
    const y = GROUND_TOP + 10 + r() * (h - 10);
    const s = 0.7 + ((y - GROUND_TOP) / h) * 0.8;
    g.fillStyle(leaves[Math.floor(r() * leaves.length)]);
    g.fillEllipse(x, y, 14 * s, 8 * s);
    g.fillTriangle(x - 7 * s, y, x - 12 * s, y - 2 * s, x - 9 * s, y + 3 * s);
  }
  // Grasbüschel wachsen über den Rand
  for (const p of edge) {
    for (let k = 0; k < 3; k++) {
      const x = p.x + (r() - 0.3) * 30;
      const y = p.y + (r() - 0.5) * 18;
      g.lineStyle(2, 0x58a844);
      g.lineBetween(x, y, x - 4, y - 9);
      g.lineBetween(x, y, x + 3, y - 10);
    }
  }
}

// --- Kleinteile ---------------------------------------------------------------------

/** Fensterlicht (weiß, wird warm eingefärbt): vier Scheiben, Sprossen bleiben dunkel. */
export function drawWindowGlow(g: G): void {
  g.fillStyle(0xffffff);
  g.fillRect(0, 0, 28, 30);
  g.fillRect(32, 0, 28, 30);
  g.fillRect(0, 34, 28, 46);
  g.fillRect(32, 34, 28, 46);
}
export const WINDOW_GLOW_SIZE = { width: 60, height: 80 };

export function drawSmoke(g: G): void {
  g.fillStyle(0xffffff, 0.35);
  g.fillCircle(24, 24, 24);
  g.fillStyle(0xffffff, 0.5);
  g.fillCircle(24, 24, 15);
}

/** Großer Laubbaum mit breiter, lichter Krone (Spielgerät „tree“, Platzhalter 560 × 660). */
// Platz über der Krone, damit die obersten Blätterbüschel nicht abgeschnitten werden
// (von der Rakete aus sieht man den Baum auch von oben, #75).
const BIG_TREE_TOP = 70;

export const BIG_TREE = {
  width: 560,
  height: 660 + BIG_TREE_TOP,
  /** Stamm und unterer Kronenbereich: dort wackelt er beim Antippen. */
  trunk: new Phaser.Geom.Rectangle(235, 360 + BIG_TREE_TOP, 90, 300),
  lowerCrown: new Phaser.Geom.Rectangle(70, 250 + BIG_TREE_TOP, 420, 130),
};

export function drawBigTree(g: G): void {
  g.save();
  g.translateCanvas(0, BIG_TREE_TOP);
  drawBigTreeBody(g);
  g.restore();
}

function drawBigTreeBody(g: G): void {
  const r = rng(230);
  // Äste zuerst: Zwischen den Blätterbüscheln sieht man sie (lichte Krone)
  const branches: [number, number, number, number, number][] = [
    [280, 400, 140, 230, 20],
    [280, 390, 420, 220, 20],
    [280, 380, 290, 120, 18],
    [200, 300, 80, 300, 12],
    [360, 300, 490, 300, 12],
    [150, 250, 120, 140, 10],
    [400, 240, 440, 130, 10],
  ];
  g.lineStyle(1, 0x5d4a3a);
  for (const [x1, y1, x2, y2, w] of branches) {
    g.lineStyle(w, 0x6b5442);
    g.lineBetween(x1, y1, x2, y2);
  }
  // Stamm mit Wurzelansatz
  g.fillStyle(0x6b5442);
  g.fillPoints([v(236, 660), v(324, 660), v(304, 620), v(298, 380), v(262, 380), v(256, 620)], true);
  g.fillStyle(0x5a4636);
  g.fillRect(286, 400, 8, 220);
  g.fillStyle(0x7d6552);
  g.fillRect(266, 420, 6, 160);

  // Lichte Krone: einzelne Blätterbüschel mit Lücken, ein paar herbstliche Blätter
  const clusters: [number, number, number][] = [
    [140, 220, 62], [90, 300, 50], [220, 170, 66], [300, 110, 64], [390, 170, 62],
    [460, 250, 56], [490, 320, 42], [60, 250, 40], [180, 110, 48], [420, 90, 46],
    [300, 230, 52], [220, 280, 44], [380, 290, 46], [130, 150, 44], [300, 40, 44],
    // Kuppe oben: rund statt flach
    [240, 30, 36], [362, 42, 34],
  ];
  const shades = [0x3d8040, 0x4a9446, 0x5aa650];
  for (const [cx, cy, rad] of clusters) {
    g.fillStyle(shades[0]);
    g.fillCircle(cx + 6, cy + 8, rad);
    g.fillStyle(shades[1]);
    g.fillCircle(cx, cy, rad * 0.92);
    g.fillStyle(shades[2]);
    g.fillCircle(cx - rad * 0.25, cy - rad * 0.25, rad * 0.55);
    // Blätter am Rand, damit die Büschel nicht wie Kugeln wirken
    for (let i = 0; i < 10; i++) {
      const a = r() * Math.PI * 2;
      g.fillStyle(shades[Math.floor(r() * 3)]);
      g.fillCircle(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad, 8 + r() * 6);
    }
  }
  for (let i = 0; i < 14; i++) {
    const [cx, cy, rad] = clusters[Math.floor(r() * clusters.length)];
    g.fillStyle(r() < 0.5 ? 0xd9c45a : 0xe39a3a);
    g.fillCircle(cx + (r() - 0.5) * rad * 1.6, cy + (r() - 0.5) * rad * 1.6, 5 + r() * 3);
  }
}
