import Phaser from 'phaser';
import { GAME_WIDTH } from '../config';
import { CAT, CATS, type CatDef } from '../data/cats';
import { FENCE_TOP, HOUSES, HOUSE_BASE_Y, HOUSE_PARALLAX } from '../data/backdrop';
import { HOUSE_SPECS } from '../scenes/placeholders/backdrop';
import { CAT_HEAD_SIZE, catKey, type CatFace } from '../scenes/placeholders/cats';
import type { PlaygroundScene } from '../scenes/PlaygroundScene';
import { isRaining } from '../world/environment';
import type { Kid } from './Kid';

// Teile in Zeichenreihenfolge: Schwanz und ferne Beine hinter dem Rumpf, nahe Beine und Kopf davor.
type Part = 'tail' | 'legBF' | 'legFF' | 'body' | 'legBN' | 'legFN' | 'head';
const PARTS: Part[] = ['tail', 'legBF', 'legFF', 'body', 'legBN', 'legFN', 'head'];

interface PartState {
  x: number;
  y: number;
  angle: number;
  scaleY: number;
}

/** Gelenke relativ zum Fußpunkt (schaut nach rechts, unverkleinert). */
const RIG: Record<Part, { x: number; y: number; originX: number; originY: number; far?: boolean }> = {
  tail: { x: -54, y: -74, originX: 1, originY: 0.5 },
  legBF: { x: -26, y: -48, originX: 0.5, originY: 0.08, far: true },
  legFF: { x: 44, y: -48, originX: 0.5, originY: 0.08, far: true },
  body: { x: 0, y: -60, originX: 0.5, originY: 0.5 },
  legBN: { x: -34, y: -48, originX: 0.5, originY: 0.08 },
  legFN: { x: 36, y: -48, originX: 0.5, originY: 0.08 },
  head: { x: 46, y: -72, originX: 22 / CAT_HEAD_SIZE.width, originY: 58 / CAT_HEAD_SIZE.height },
};

type CatPose = 'stand' | 'sit' | 'loaf' | 'jump';

/** Posen als Abweichung vom Gelenk (Winkel in Grad, + = im Uhrzeigersinn). Schwanz: Winkel absolut. */
const POSES: Record<CatPose, Partial<Record<Part, Partial<PartState>>>> = {
  // Schwanz hoch erhoben
  stand: { tail: { angle: 55 } },
  // Sitzen: Rumpf aufgerichtet, Hinterbeine flach am Boden, Schwanz liegt hinten
  sit: {
    body: { x: -12, y: 16, angle: -38 },
    head: { x: -30, y: -6 },
    tail: { x: -8, y: 66, angle: -4 },
    legFN: { x: -18, y: -4, scaleY: 1.12 },
    legFF: { x: -20, y: -4, scaleY: 1.12 },
    legBN: { x: 18, y: 38, angle: -84, scaleY: 0.6 },
    legBF: { x: 14, y: 36, angle: -84, scaleY: 0.6 },
  },
  // Brotlaib: liegt mit eingeklappten Pfoten
  loaf: {
    body: { y: 36 },
    head: { x: -4, y: 34 },
    tail: { y: 62, angle: -6 },
    legFN: { y: 36, angle: -88, scaleY: 0.5 },
    legFF: { x: -8, y: 34, angle: -88, scaleY: 0.5 },
    legBN: { y: 36, angle: -80, scaleY: 0.45 },
    legBF: { y: 34, angle: -80, scaleY: 0.45 },
  },
  jump: {
    tail: { angle: 20 },
    legFN: { angle: -60 },
    legFF: { angle: -50 },
    legBN: { angle: 50 },
    legBF: { angle: 42 },
  },
};

/** Wo die Katze gerade ist – bestimmt die Tiefe. */
type Ground = 'behindFence' | 'fence' | 'meadow' | 'roof';
const FENCE_DEPTH_BEHIND = -1001; // zwischen Wiese und Zaun: der Zaun verdeckt sie
const FENCE_DEPTH_ON = -997; // vor Zaun und Pergola, hinter den Büschen
const ROOF_DEPTH = -1020.1; // hinter den Häusern: oben auf dem First sichtbar, dahinter verdeckt

type Step =
  | { kind: 'walk'; x: number; y: number; run?: boolean }
  | { kind: 'jump'; x: number; y: number; height: number; ms: number; ground: Ground; groundAtStart?: Ground }
  | { kind: 'rest'; pose: CatPose; ms: number; groom?: boolean; look?: boolean }
  /** Zurück auf den Zaun und weg (wird erst dann geplant, wenn es so weit ist). */
  | { kind: 'exit'; run: boolean; wait: boolean };

const FOLLOW_RATE = 16;
/** Höhe der ganzen Figur (unverkleinert), um sie hinter Zaun oder Dach ganz zu verstecken. */
const FULL_HEIGHT = 150;

/**
 * Eine Nachbarskatze. Läuft über die Wiese (springt über den Zaun herein und wieder hinaus) oder oben
 * über einen Dachfirst (taucht hinter dem Dach auf und verschwindet wieder dahinter). Was sie tut, ist
 * eine Liste von Schritten (laufen, springen, sitzen, putzen, liegen). Antippen = miau und herschauen.
 * Vor dem wachen Hund flüchtet sie auf den Zaun, bei Regen geht sie heim. Wird nicht gespeichert.
 */
export class Cat extends Phaser.GameObjects.Container {
  private readonly parts = {} as Record<Part, Phaser.GameObjects.Image>;
  private readonly cur = {} as Record<Part, PartState>;
  private steps: Step[] = [];
  private step?: Step;
  private stepTime = 0;
  private from = { x: 0, y: 0 };
  private ground: Ground = 'meadow';
  private pose: CatPose = 'stand';
  private facing = 1;
  private clock = 0;
  private travel = 0;
  private moving = false;
  private running = false;
  private face: CatFace = 'normal';
  private meowUntil = 0;
  private nextBlink = 2000;
  private fleeing = false;
  private readonly greeted = new Set<Kid>();

  constructor(
    scene: PlaygroundScene,
    readonly def: CatDef,
    /** Verkleinerung der ganzen Figur (Wiese oder Dach). */
    private readonly size: number,
    private readonly onGone: (cat: Cat) => void,
  ) {
    super(scene, 0, 0);
    for (const id of PARTS) {
      const r = RIG[id];
      const key = id === 'head' ? catKey(def, 'head-normal') : catKey(def, id.startsWith('leg') ? 'leg' : id);
      const img = scene.add.image(0, 0, key).setOrigin(r.originX, r.originY);
      if (r.far) img.setTint(0xa0a0a0); // ferne Beine etwas dunkler
      this.parts[id] = img;
      this.cur[id] = this.target(id);
      this.add(img);
    }
    this.applyParts();
    // Auf dem Dach ist die Katze winzig: dort eine viel größere Touch-Fläche.
    const roof = size < CAT.scale * 0.6;
    const w = roof ? 460 : 260;
    const h = roof ? 340 : 170;
    this.setSize(w, h).setScale(size);
    scene.add.existing(this);
    this.addToUpdateList();
    // Wie beim Hund: Container rechnen die Touch-Fläche ab ihrer Mitte, Fußpunkt unten Mitte.
    this.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(0, -h / 2 + (roof ? 60 : 0), w, h),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true,
    });
    this.setData('onTap', () => this.tapped());
  }

  private get playground(): PlaygroundScene {
    return this.scene as PlaygroundScene;
  }

  /** Startet an (x, y) mit einer Liste von Schritten; ist sie abgelaufen, ist die Katze weg. */
  start(x: number, y: number, ground: Ground, facing: number, steps: Step[]): this {
    this.setPosition(x, y);
    this.ground = ground;
    this.facing = facing;
    this.steps = steps;
    if (ground === 'roof') this.setScrollFactor(HOUSE_PARALLAX, 1, true);
    this.updateDepth();
    this.applyParts();
    return this;
  }

  /** Läuft gerade über die Wiese (nicht auf Zaun oder Dach)? */
  get onMeadow(): boolean {
    return this.ground === 'meadow';
  }

  /** Nach Hause, ohne Umwege. dog: vor dem Hund geflüchtet (rennt, wartet oben auf dem Zaun). */
  hurryHome(dog = false): void {
    if (this.fleeing) return;
    this.fleeing = true;
    if (this.ground === 'meadow') {
      const exit: Step = { kind: 'exit', run: true, wait: dog };
      // Ein Sprung läuft zu Ende, alles andere bricht ab.
      if (this.step?.kind === 'jump') this.steps = [exit];
      else {
        this.step = undefined;
        this.steps = [exit];
      }
    } else if (this.ground === 'roof') {
      // Auf dem Dach: nur nicht mehr trödeln
      this.steps = this.steps.filter((s) => s.kind !== 'rest');
      if (this.step?.kind === 'rest') this.step = undefined;
    } else {
      // Noch hinter oder schon auf dem Zaun: gleich wieder dahinter verschwinden
      const jumping = this.step?.kind === 'jump';
      if (!jumping) this.step = undefined;
      this.steps = this.ground === 'fence' || jumping ? [hopBehind(this.x, this.facing)] : [];
    }
  }

  private tapped(): void {
    this.meow();
    const s = this.step;
    if (this.fleeing || !s || s.kind === 'jump') return;
    if (s.kind === 'walk') {
      // Stehen bleiben, sich hinsetzen und herschauen, dann weiter
      this.steps.unshift(s);
      this.begin({ kind: 'rest', pose: 'sit', ms: CAT.lookMs, look: true });
    } else if (s.kind === 'rest' && !s.look) {
      this.begin({ ...s, pose: 'sit', groom: false, look: true, ms: Math.max(CAT.lookMs, s.ms - this.stepTime) });
    }
  }

  private meow(): void {
    this.meowUntil = this.clock + 550;
    this.scene.events.emit('sound', { kind: 'meow', pitch: this.def.voice, x: this.worldX() });
  }

  /** Waagerechte Weltposition (auf dem Dach umgerechnet aus der Häuser-Ebene, fürs Stereo). */
  private worldX(): number {
    if (this.ground !== 'roof') return this.x;
    const cam = this.scene.cameras.main;
    return this.x - cam.scrollX * HOUSE_PARALLAX + cam.scrollX;
  }

  // --- Jedes Bild ----------------------------------------------------------

  preUpdate(_time: number, delta: number): void {
    const dt = Math.min(delta, 50);
    this.clock += dt;
    this.moving = false;
    this.running = false;
    this.think(dt);
    if (this.active) this.animate(dt);
  }

  private think(dt: number): void {
    if (!this.step) {
      const next = this.steps.shift();
      if (!next) {
        this.onGone(this);
        this.destroy();
        return;
      }
      this.begin(next);
    }
    const s = this.step!;
    this.stepTime += dt;
    switch (s.kind) {
      case 'walk':
        if (this.stepTowards(s.x, s.y, s.run ? CAT.runSpeed : CAT.walkSpeed, dt, s.run)) this.step = undefined;
        break;
      case 'jump': {
        const t = Math.min(1, this.stepTime / s.ms);
        const scale = this.size / CAT.scale;
        this.x = Phaser.Math.Linear(this.from.x, s.x, t);
        this.y = Phaser.Math.Linear(this.from.y, s.y, t) - s.height * scale * 4 * t * (1 - t);
        if (t >= 1) {
          this.ground = s.ground;
          this.setPose('stand');
          this.step = undefined;
        }
        break;
      }
      case 'rest':
        if (this.stepTime >= s.ms) {
          this.setPose('stand');
          this.step = undefined;
        }
        break;
      case 'exit':
        this.step = undefined;
        this.steps = [...this.exitSteps(s.run, s.wait), ...this.steps];
        break;
    }
    if (this.ground === 'meadow' && this.active) this.watchMeadow();
    this.updateDepth();
  }

  private begin(s: Step): void {
    this.step = s;
    this.stepTime = 0;
    this.from = { x: this.x, y: this.y };
    if (s.kind === 'jump') {
      if (s.groundAtStart) this.ground = s.groundAtStart;
      if (Math.abs(s.x - this.x) > 2) this.facing = s.x > this.x ? 1 : -1;
      this.setPose('jump');
    } else if (s.kind === 'rest') {
      this.setPose(s.pose);
    }
  }

  /** Einen Schritt Richtung (x, y). true = angekommen. */
  private stepTowards(x: number, y: number, speed: number, dt: number, run = false): boolean {
    const dx = x - this.x;
    const dy = y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 3) return true;
    // Auf dem Dach ist alles kleiner: auch die Schritte
    const step = Math.min(dist, (speed * (this.size / CAT.scale) * dt) / 1000);
    this.x += (dx / dist) * step;
    this.y += (dy / dist) * step;
    if (Math.abs(dx) > 2) this.facing = dx > 0 ? 1 : -1;
    this.travel += step / this.size;
    this.moving = true;
    this.running = run;
    if (this.pose !== 'stand') this.setPose('stand');
    return false;
  }

  /** Auf der Wiese: wacher Hund in der Nähe → flüchten; Kinder am Weg kichern. */
  private watchMeadow(): void {
    const scene = this.playground;
    const dog = scene.dog;
    if (!this.fleeing && dog && !dog.asleep && Math.abs(dog.x - this.x) < CAT.dogRange && Math.abs(dog.y - this.y) < 140) {
      dog.chaseCat(this.x, this.y);
      this.hurryHome(true);
      return;
    }
    if (!this.moving || this.running) return;
    for (const kid of scene.kidsOnMeadow()) {
      if (this.greeted.has(kid) || !kid.visible || kid.mode !== 'idle') continue;
      if (Math.abs(kid.x - this.x) < CAT.kidRange && Math.abs(kid.y - this.y) < 60) {
        this.greeted.add(kid);
        kid.giggle();
      }
    }
  }

  private updateDepth(): void {
    switch (this.ground) {
      case 'meadow':
        this.setDepth(this.y);
        break;
      case 'fence':
        this.setDepth(FENCE_DEPTH_ON);
        break;
      case 'behindFence':
        this.setDepth(FENCE_DEPTH_BEHIND);
        break;
      case 'roof':
        this.setDepth(ROOF_DEPTH);
        break;
    }
  }

  // --- Weg nach Hause --------------------------------------------------------

  /** Von der Wiese zum nächsten freien Zaunstück, hinauf, ein Stück darauf und dahinter hinunter. */
  private exitSteps(run: boolean, wait: boolean): Step[] {
    const xe = fenceSpotNear(this.x);
    const dir = this.x <= xe ? 1 : -1;
    const steps: Step[] = [
      { kind: 'walk', x: xe - dir * 10, y: CAT.meadowMinY, run },
      { kind: 'jump', x: xe, y: FENCE_TOP, height: 60, ms: 520, ground: 'fence' },
    ];
    // Vor dem Hund in Sicherheit: erst mal oben sitzen und hinunterschauen
    if (wait) steps.push({ kind: 'rest', pose: 'sit', ms: Phaser.Math.Between(2500, 4000), look: true });
    const xf = xe + dir * Phaser.Math.Between(40, 140);
    const along = fenceClear(xe, xf) ? xf : xe;
    if (along !== xe) steps.push({ kind: 'walk', x: along, y: FENCE_TOP });
    steps.push(hopBehind(along, dir));
    return steps;
  }

  // --- Bewegung der Teile ----------------------------------------------------

  private setPose(pose: CatPose): void {
    this.pose = pose;
  }

  /** Grundpose plus Bewegung (Laufen, Schwanz, Putzen) für ein Teil. */
  private target(id: Part): PartState {
    const r = RIG[id];
    const p = POSES[this.pose ?? 'stand'][id] ?? {};
    const tailBase = POSES.stand.tail?.angle ?? 0;
    const s: PartState = {
      x: r.x + (p.x ?? 0),
      y: r.y + (p.y ?? 0),
      angle: p.angle ?? (id === 'tail' ? tailBase : 0),
      scaleY: p.scaleY ?? 1,
    };
    const t = this.clock / 1000;
    const step = this.step;
    if (this.pose === 'stand' && this.moving) {
      // Laufen: diagonale Beinpaare schwingen gegeneinander, Rumpf wippt leicht
      const phase = this.travel / (this.running ? 30 : 22);
      const amp = this.running ? 38 : 22;
      const swing = (offset: number) => Math.sin(phase + offset) * amp;
      if (id === 'legFN' || id === 'legBF') s.angle += swing(0);
      if (id === 'legFF' || id === 'legBN') s.angle += swing(Math.PI);
      if (id === 'body') s.y += Math.abs(Math.sin(phase)) * -2;
      if (id === 'head') s.y += Math.abs(Math.sin(phase)) * -2;
      if (id === 'tail') s.angle = this.running ? 12 : tailBase + Math.sin(t * 3) * 6;
    } else if (id === 'tail') {
      // Schwanzspitze zuckt gemütlich
      s.angle += Math.sin(t * 1.7) * (this.pose === 'stand' ? 8 : 5);
    }
    if (step?.kind === 'jump' && id === 'body') {
      // Im Sprung nach oben gestreckt, beim Herunterkommen nach vorn geneigt
      const t2 = this.stepTime / step.ms;
      const up = step.y < this.from.y - 20;
      s.angle = up ? (t2 < 0.6 ? -24 : 8) : t2 < 0.4 ? -8 : 18;
    }
    if (step?.kind === 'rest') {
      if (step.groom && (id === 'head' || id === 'legFN')) {
        // Putzt sich: Pfote hoch zum Maul, Kopf beugt sich darüber und leckt
        const lick = Math.sin(t * 9) * 6;
        if (id === 'legFN') {
          s.angle = -105 + lick;
          s.x += 4;
          s.y += -6;
          s.scaleY = 0.85;
        } else {
          s.angle = 22 + lick * 0.5;
          s.x += -6;
          s.y += 6;
        }
      } else if (step.look && id === 'head') {
        // Schaut her (leicht schief gelegter Kopf)
        s.angle = -14 + Math.sin(t * 1.3) * 4;
      }
    }
    if (id === 'head' && this.clock < this.meowUntil) s.angle -= 10;
    return s;
  }

  private animate(dt: number): void {
    const k = 1 - Math.exp((-FOLLOW_RATE * dt) / 1000);
    for (const id of PARTS) {
      const want = this.target(id);
      const c = this.cur[id];
      c.x += (want.x - c.x) * k;
      c.y += (want.y - c.y) * k;
      c.angle += (want.angle - c.angle) * k;
      c.scaleY += (want.scaleY - c.scaleY) * k;
    }
    // Gesicht: miau, blinzeln, beim Putzen und Liegen Augen zu
    const s = this.step;
    if (this.clock >= this.nextBlink + 160) this.nextBlink = this.clock + Phaser.Math.Between(2500, 6000);
    const sleepy = s?.kind === 'rest' && (s.groom || s.pose === 'loaf');
    const face: CatFace = this.clock < this.meowUntil ? 'meow' : sleepy || this.clock >= this.nextBlink ? 'blink' : 'normal';
    if (face !== this.face) {
      this.face = face;
      this.parts.head.setTexture(catKey(this.def, `head-${face}`));
    }
    this.scaleX = this.facing * this.size;
    this.applyParts();
  }

  private applyParts(): void {
    for (const id of PARTS) {
      const c = this.cur[id];
      this.parts[id].setPosition(c.x, c.y).setAngle(c.angle).setScale(1, c.scaleY);
    }
  }
}

// --- Zaun --------------------------------------------------------------------

function onFence(x: number): boolean {
  return x >= CAT.fenceMinX && x <= CAT.fenceMaxX && !CAT.fenceAvoid.some(([a, b]) => x >= a && x <= b);
}

/** Kann sie auf dem Zaun von a nach b laufen (kein Tor dazwischen)? */
function fenceClear(a: number, b: number): boolean {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  return onFence(lo) && onFence(hi) && !CAT.fenceAvoid.some(([x0, x1]) => x0 <= hi && x1 >= lo);
}

/** Nächster Platz auf dem Zaun, auf den sie springen kann. */
function fenceSpotNear(x: number): number {
  for (let d = 0; d < 6000; d += 30) {
    if (onFence(x + d)) return x + d;
    if (onFence(x - d)) return x - d;
  }
  return CAT.fenceMinX;
}

/** Vom Zaun nach hinten hinunter (der Zaun verdeckt sie dann). */
function hopBehind(x: number, dir: number): Step {
  return { kind: 'jump', x: x + dir * 24, y: FENCE_TOP + FULL_HEIGHT * CAT.scale + 10, height: 30, ms: 480, ground: 'behindFence', groundAtStart: 'behindFence' };
}

// --- Alle Katzen ---------------------------------------------------------------

/**
 * Schickt ab und zu eine der Nachbarskatzen los (`CATS`): über die Wiese oder über einen Dachfirst,
 * immer dort, wo man gerade hinschaut. Höchstens `CAT.maxOut` gleichzeitig, jede nur einmal, bei Regen keine.
 */
export class Cats {
  private readonly out = new Map<string, Cat>();
  private clock = 0;
  private nextVisit = CAT.firstVisit;

  constructor(private readonly scene: PlaygroundScene) {
    scene.events.on(Phaser.Scenes.Events.UPDATE, (_t: number, delta: number) => this.update(delta));
  }

  private update(delta: number): void {
    this.clock += Math.min(delta, 50);
    if (isRaining()) for (const cat of this.out.values()) cat.hurryHome();
    if (this.clock < this.nextVisit) return;
    this.nextVisit = this.clock + Phaser.Math.Between(CAT.pauseMin, CAT.pauseMax);
    this.visit();
  }

  /** Schickt eine Katze los (für die nächste freie Katze; false = gerade keine möglich). */
  visit(where?: 'roof' | 'meadow'): boolean {
    if (isRaining() || this.out.size >= CAT.maxOut) return false;
    const free = CATS.filter((c) => !this.out.has(c.id));
    const def = free[Phaser.Math.Between(0, free.length - 1)];
    if (!def) return false;
    const roof = where ? where === 'roof' : Math.random() < CAT.roofShare;
    const cat = (roof ? this.roofVisit(def) : this.meadowVisit(def)) ?? (where ? undefined : roof ? this.meadowVisit(def) : this.roofVisit(def));
    if (!cat) return false;
    this.out.set(def.id, cat);
    return true;
  }

  private gone = (cat: Cat) => this.out.delete(cat.def.id);

  /** Über den Zaun auf die Wiese, ein bisschen herumstreunen, sitzen, putzen, wieder hinaus. */
  private meadowVisit(def: CatDef): Cat | undefined {
    const view = this.scene.cameras.main.worldView;
    let x0: number | undefined;
    for (let i = 0; i < 12 && x0 === undefined; i++) {
      const x = Phaser.Math.Between(Math.round(view.left + 160), Math.round(view.right - 160));
      if (onFence(x)) x0 = x;
    }
    if (x0 === undefined) return undefined;
    const dir = x0 < view.centerX ? 1 : -1;
    const steps: Step[] = [{ kind: 'jump', x: x0 + dir * 24, y: FENCE_TOP, height: 40, ms: 520, ground: 'fence' }];
    let x = x0 + dir * 24;
    const along = x + dir * Phaser.Math.Between(60, 180);
    if (fenceClear(x, along)) {
      steps.push({ kind: 'walk', x: along, y: FENCE_TOP });
      x = along;
    }
    if (Math.random() < 0.5) steps.push({ kind: 'rest', pose: 'sit', ms: Phaser.Math.Between(1200, 2500) });
    x = Phaser.Math.Clamp(x + dir * 60, 100, CAT.fenceMaxX);
    let y = Phaser.Math.Between(CAT.meadowMinY + 10, CAT.meadowMinY + 60);
    steps.push({ kind: 'jump', x, y, height: 30, ms: 560, ground: 'meadow', groundAtStart: 'meadow' });
    const stops = Phaser.Math.Between(1, 3);
    for (let i = 0; i < stops; i++) {
      x = Phaser.Math.Clamp(x + Phaser.Math.Between(-CAT.wanderRange, CAT.wanderRange), 100, CAT.fenceMaxX);
      y = Phaser.Math.Between(CAT.meadowMinY, CAT.meadowMaxY);
      steps.push({ kind: 'walk', x, y });
      const r = Math.random();
      if (r < 0.3) steps.push({ kind: 'rest', pose: 'sit', ms: Phaser.Math.Between(2000, 4000) });
      else if (r < 0.55) steps.push({ kind: 'rest', pose: 'sit', groom: true, ms: Phaser.Math.Between(3000, 4500) });
      else if (r < 0.7) steps.push({ kind: 'rest', pose: 'loaf', ms: Phaser.Math.Between(4000, 6500) });
    }
    steps.push({ kind: 'exit', run: false, wait: false });
    const cat = new Cat(this.scene, def, CAT.scale, this.gone);
    return cat.start(x0, FENCE_TOP + FULL_HEIGHT * CAT.scale + 10, 'behindFence', dir, steps);
  }

  /** Taucht hinter einem Dachfirst auf, läuft darüber (mit Pause) und verschwindet am anderen Ende. */
  private roofVisit(def: CatDef): Cat | undefined {
    const scrollX = this.scene.cameras.main.scrollX * HOUSE_PARALLAX;
    const houses = HOUSES.filter((h) => {
      const ridge = HOUSE_SPECS[h.kind].ridge;
      const sx = h.x - scrollX;
      return ridge && sx > 200 && sx < GAME_WIDTH - 200;
    });
    const h = houses[Phaser.Math.Between(0, houses.length - 1)];
    if (!h) return undefined;
    const spec = HOUSE_SPECS[h.kind];
    const ridge = spec.ridge!;
    const hs = h.scale ?? 1;
    const left = h.x - (spec.width / 2) * hs;
    const top = HOUSE_BASE_Y - spec.height * hs;
    // Oberkante der Firstlinie (6 px dick)
    const ridgeY = top + (ridge.y - 3) * hs;
    const rl = left + (ridge.left + 16) * hs;
    const rr = left + (ridge.right - 16) * hs;
    const size = CAT.scale * CAT.roofScale * hs;
    const hidden = ridgeY + FULL_HEIGHT * size + 4;
    const dir = Math.random() < 0.5 ? 1 : -1;
    const xs = dir > 0 ? rl : rr;
    const xe = dir > 0 ? rr : rl;
    const climb = 50 * size;
    const mid = Phaser.Math.Linear(rl, rr, Phaser.Math.FloatBetween(0.35, 0.65));
    const r = Math.random();
    const rest: Step =
      r < 0.4
        ? { kind: 'rest', pose: 'sit', ms: Phaser.Math.Between(2500, 4500) }
        : r < 0.7
          ? { kind: 'rest', pose: 'sit', groom: true, ms: Phaser.Math.Between(3000, 4500) }
          : { kind: 'rest', pose: 'loaf', ms: Phaser.Math.Between(4000, 7000) };
    const steps: Step[] = [
      { kind: 'walk', x: xs + dir * climb, y: ridgeY },
      { kind: 'walk', x: mid, y: ridgeY },
      rest,
      { kind: 'walk', x: xe, y: ridgeY },
      { kind: 'walk', x: xe + dir * climb, y: hidden },
    ];
    const cat = new Cat(this.scene, def, size, this.gone);
    return cat.start(xs, hidden, 'roof', dir, steps);
  }
}
