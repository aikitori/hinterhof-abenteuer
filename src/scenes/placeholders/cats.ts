import Phaser from 'phaser';
import type { CatDef } from '../../data/cats';

// Katzen aus Einzelteilen (Seitenansicht, schaut nach rechts): Rumpf, Kopf (normal, Augen zu,
// Miau), Bein, Schwanz. Die Teile setzt src/objects/Cat.ts an Gelenken zusammen.

type G = Phaser.GameObjects.Graphics;
const v = (x: number, y: number) => new Phaser.Math.Vector2(x, y);

export const CAT_BODY_SIZE = { width: 120, height: 54 };
export const CAT_HEAD_SIZE = { width: 74, height: 70 };
export const CAT_LEG_SIZE = { width: 16, height: 50 };
export const CAT_TAIL_SIZE = { width: 90, height: 16 };
export const CAT_SHORT_TAIL_SIZE = { width: 34, height: 18 };

export type CatFace = 'normal' | 'blink' | 'meow';
export const CAT_FACES: CatFace[] = ['normal', 'blink', 'meow'];

export const catKey = (def: CatDef, part: string) => `cat-${def.id}-${part}`;

export function drawCatBody(g: G, c: CatDef): void {
  const { width: w, height: h } = CAT_BODY_SIZE;
  g.fillStyle(c.fur);
  g.fillEllipse(w / 2, h / 2, w - 4, h - 10);
  g.fillCircle(w - 26, h / 2 + 2, 22); // Brust
  g.fillCircle(26, h / 2 - 1, 23); // Hinterteil
  if (c.belly) {
    // Heller Bauch und Brust
    g.fillStyle(c.belly);
    g.fillEllipse(w / 2 + 8, h - 12, w - 46, 16);
    g.fillEllipse(w - 18, h / 2 + 8, 22, 30);
  }
  if (c.stripes) {
    g.fillStyle(c.dark);
    for (let x = 22; x < w - 20; x += 15) g.fillPoints([v(x, 5), v(x + 8, 5), v(x + 4, 22), v(x - 1, 20)], true);
  }
  // Glanz auf dem Rücken
  g.fillStyle(c.light, 0.6);
  g.fillEllipse(w / 2 - 4, 10, w - 50, 7);
}

/** Kopf, Halsgelenk bei (22, 58). */
export function drawCatHead(g: G, c: CatDef, face: CatFace): void {
  const cx = 34;
  const cy = 38;
  g.fillStyle(c.fur);
  g.fillEllipse(22, 54, 30, 26); // Hals
  // Ohren
  g.fillTriangle(12, 26, 18, 2, 34, 18);
  g.fillTriangle(36, 16, 50, 0, 54, 26);
  g.fillStyle(0xd98a8a);
  g.fillTriangle(17, 22, 20, 9, 29, 18);
  g.fillTriangle(41, 17, 49, 8, 50, 23);
  // Schädel und Schnauze
  g.fillStyle(c.fur);
  g.fillCircle(cx, cy, 25);
  g.fillEllipse(56, 46, 30, 22);
  if (c.belly) {
    g.fillStyle(c.belly);
    g.fillEllipse(56, 50, 26, 16); // helle Schnauze
    g.fillEllipse(34, 60, 22, 12); // helles Kinn
  }
  if (c.stripes) {
    g.fillStyle(c.dark);
    g.fillRect(24, 16, 4, 12);
    g.fillRect(32, 14, 4, 13);
    g.fillRect(40, 16, 4, 11);
    g.fillRect(12, 38, 11, 3);
    g.fillRect(12, 45, 10, 3);
  }
  // Nase
  g.fillStyle(0xe58a96);
  g.fillTriangle(66, 40, 72, 40, 70, 46);
  // Maul
  if (face === 'meow') {
    g.fillStyle(0x5c1a28);
    g.fillEllipse(63, 54, 12, 11);
    g.fillStyle(0xf28482);
    g.fillEllipse(63, 57, 7, 4);
  } else {
    g.lineStyle(2, c.dark);
    g.beginPath();
    g.arc(66, 49, 4, 0.2, Math.PI - 0.4, false);
    g.strokePath();
  }
  // Schnurrhaare
  g.lineStyle(1.5, c.id === 'black' ? 0x9a9aa5 : 0xffffff, 0.9);
  g.lineBetween(58, 48, 74, 44);
  g.lineBetween(58, 50, 74, 52);
  // Auge
  if (face === 'blink') {
    g.lineStyle(3, c.dark === 0x0c0b0e ? 0x55535e : c.dark);
    g.beginPath();
    g.arc(46, 32, 6, 0.3, Math.PI - 0.3, false);
    g.strokePath();
  } else {
    g.fillStyle(c.eyes);
    g.fillEllipse(46, 32, 13, 12);
    g.fillStyle(0x000000);
    g.fillEllipse(47, 32, 4, 10);
    g.fillStyle(0xffffff);
    g.fillCircle(49, 29, 2);
  }
}

/** Bein mit Pfote, Hüft-/Schultergelenk oben Mitte. */
export function drawCatLeg(g: G, c: CatDef): void {
  const { width: w, height: h } = CAT_LEG_SIZE;
  g.fillStyle(c.fur);
  g.fillRoundedRect(2, 0, w - 4, h - 6, 6);
  if (c.stripes) {
    g.fillStyle(c.dark);
    for (let y = 12; y < h - 14; y += 11) g.fillRect(2, y, w - 4, 4);
  }
  g.fillStyle(c.belly ?? c.fur);
  g.fillEllipse(w / 2 + 2, h - 6, w, 11);
}

/** Schwanz: Wurzel rechts, Spitze links (lang oder Stummel). */
export function drawCatTail(g: G, c: CatDef): void {
  const { width: w, height: h } = c.shortTail ? CAT_SHORT_TAIL_SIZE : CAT_TAIL_SIZE;
  g.fillStyle(c.fur);
  g.fillRoundedRect(h / 2, 2, w - h / 2, h - 4, (h - 4) / 2);
  g.fillCircle(h / 2 + 1, h / 2, h / 2 - (c.shortTail ? 0 : 2));
  if (c.stripes) {
    g.fillStyle(c.dark);
    for (let x = 4; x < w - 8; x += 10) g.fillRect(x, 2, 4, h - 4);
  }
}
