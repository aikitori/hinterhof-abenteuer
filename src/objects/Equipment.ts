import Phaser from 'phaser';
import type { EquipmentDef } from '../data/playground';
import { BIG_TREE } from '../scenes/placeholders/backdrop';
import { BOX } from '../scenes/placeholders/dressup';
import { HOUSE_AREA, PH, sidePoint, SLIDE_AREA, slideAngle, slidePoint } from '../scenes/placeholders/playhouse';
import type { PlaygroundScene } from '../scenes/PlaygroundScene';
import type { Toy } from './toys/Toy';
import { windStrength } from '../world/environment';
import type { Kid, Seat } from './Kid';

/**
 * Basisklasse für Spielgeräte. Standardmäßig passiert nichts –
 * die Unterklassen überschreiben, was sie brauchen.
 */
export abstract class Equipment {
  constructor(
    protected readonly scene: Phaser.Scene,
    readonly def: EquipmentDef,
  ) {}

  /** Wird jeden Frame aufgerufen. */
  update(): void {}

  /** Nimmt das Gerät ein Kind an, das an (x, y) losgelassen wurde? */
  accepts(_kid: Kid, _x: number, _y: number): boolean {
    return false;
  }

  /** Kind benutzt das Gerät. */
  use(_kid: Kid): void {}
}

// ---------------------------------------------------------------------------

export class Swing extends Equipment implements Seat {
  private static readonly ROPE_LENGTH = 300;
  private static readonly MAX_ANGLE = 0.45; // Bogenmaß

  private readonly ropes: Phaser.GameObjects.Graphics;
  private readonly pivot: Phaser.Math.Vector2;
  private rider?: Kid;

  constructor(scene: Phaser.Scene, def: EquipmentDef) {
    super(scene, def);
    scene.add.image(def.x, def.y, 'swing-frame').setOrigin(0.5, 1).setDepth(def.y);
    this.pivot = new Phaser.Math.Vector2(def.x, def.y - 400);

    const L = Swing.ROPE_LENGTH;
    this.ropes = scene.add.graphics({ x: this.pivot.x, y: this.pivot.y }).setDepth(def.y + 1);
    this.ropes.lineStyle(5, 0x444444);
    this.ropes.lineBetween(-45, 0, -45, L);
    this.ropes.lineBetween(45, 0, 45, L);
    this.ropes.fillStyle(0xe76f51);
    this.ropes.fillRoundedRect(-62, L - 8, 124, 18, 6);
  }

  override accepts(_kid: Kid, x: number, y: number): boolean {
    if (this.rider) return false;
    const seatX = this.pivot.x;
    const seatY = this.pivot.y + Swing.ROPE_LENGTH;
    return Phaser.Math.Distance.Between(x, y, seatX, seatY) < 160;
  }

  override use(kid: Kid): void {
    this.rider = kid;
    kid.mode = 'swinging';
    kid.seatedOn = this;
    kid.exitPoint = { x: this.def.x + 190, y: this.def.y + 60 };

    const tweens = this.scene.tweens;
    tweens.killTweensOf(this.ropes);
    tweens.add({
      targets: this.ropes,
      rotation: -Swing.MAX_ANGLE,
      duration: 500,
      ease: 'Sine.easeOut',
      onComplete: () => {
        tweens.add({
          targets: this.ropes,
          rotation: Swing.MAX_ANGLE,
          duration: 1100,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      },
    });
  }

  unseat(kid: Kid): void {
    if (this.rider !== kid) return;
    this.rider = undefined;
    kid.seatedOn = undefined;
    kid.exitPoint = undefined;
    kid.mode = 'idle';
    kid.setRotation(0);

    this.scene.tweens.killTweensOf(this.ropes);
    this.scene.tweens.add({
      targets: this.ropes,
      rotation: 0,
      duration: 900,
      ease: 'Sine.easeOut',
    });
  }

  override update(): void {
    if (!this.rider) {
      // Leere Schaukel wiegt sich im Wind
      if (this.scene.tweens.isTweening(this.ropes)) return;
      const target = Math.sin(this.scene.time.now / 700) * 0.12 * Math.min(1.5, windStrength());
      this.ropes.rotation += (target - this.ropes.rotation) * 0.05;
      return;
    }
    const r = this.ropes.rotation;
    // Das Kind sitzt mit der Hüfte auf dem Brett (Oberkante bei L − 8), die Beine hängen darunter.
    const d = Swing.ROPE_LENGTH - 8 + this.rider.hipHeight();
    this.rider
      .setPosition(this.pivot.x - d * Math.sin(r), this.pivot.y + d * Math.cos(r))
      .setRotation(r)
      .setDepth(this.def.y + 2);
  }
}

// ---------------------------------------------------------------------------

/** Wo ein Kind im Spielhaus ist: oben auf dem Podest, drinnen am Boden oder unterwegs. */
type HouseSpot = { where: 'top' | 'inside'; index: number } | { where: 'moving' };

/**
 * Kletter-Spielhaus mit Rutsche (#65), ersetzt die alte Rutsche. Offener Würfel ohne Dach:
 * Kind aufs Haus ziehen = klettert an den Sprossen hoch und sitzt oben auf dem Podest (Kopf und
 * Schultern schauen über die Wand); Kind unten ans große Loch ziehen = krabbelt hinein.
 * Kind oben antippen = rutscht die Rutsche hinunter. Haus (oder ein Kind drinnen) antippen =
 * ein Kind guckt durch ein Loch oder winkt aus dem Bogen. Bis zu 3 Kinder. Bälle, die durch die
 * Löcher rollen oder fliegen, landen drinnen. Maße in src/scenes/placeholders/playhouse.ts (PH).
 */
export class PlayHouse extends Equipment implements Seat {
  private static readonly CAPACITY = 3;
  /** Tiefe hinter der Vorderwand für Kinder oben und drinnen (die Rückseite liegt noch dahinter). */
  private static readonly BACK = -130;
  private static readonly TOP = -100;
  private static readonly INSIDE = -40;
  /** Plätze oben auf dem Podest und drinnen (x relativ zur Mitte, Fußpunkt-y des Sitzes). */
  private static readonly TOP_SEATS = [20, 100].map((x) => ({ x: x + PH.depth.x * 0.62, y: -PH.platform.height + PH.depth.y * 0.62 }));
  private static readonly INSIDE_SEATS = [-60, 5, 70].map((x) => ({ x: x + PH.depth.x * 0.4, y: PH.depth.y * 0.4 }));

  private readonly front: Phaser.GameObjects.Image;
  private readonly kids = new Map<Kid, HouseSpot>();
  private readonly balls = new Map<Toy, { x: number; g: number; z: number }>();
  private peekTurn = 0;

  constructor(scene: Phaser.Scene, def: EquipmentDef) {
    super(scene, def);
    scene.add
      .image(def.x + HOUSE_AREA.x, def.y + HOUSE_AREA.y, 'playhouse-back')
      .setOrigin(0)
      .setDepth(def.y + PlayHouse.BACK);
    this.front = scene.add
      .image(def.x + HOUSE_AREA.x, def.y + HOUSE_AREA.y, 'playhouse-front')
      .setOrigin(0)
      .setDepth(def.y);
    // Die Rutsche liegt vor allem
    scene.add
      .image(def.x + SLIDE_AREA.x, def.y + SLIDE_AREA.y, 'playhouse-slide')
      .setOrigin(0)
      .setDepth(def.y + PH.slide.bottom.y);

    // Touch-Fläche: Vorderwand und Seitenwand. Kinder davor haben Vorrang (Deko, touchRank).
    const { half, height: H, depth: D } = PH;
    const outline = [
      new Phaser.Geom.Point(-half + D.x, D.y),
      new Phaser.Geom.Point(-half + D.x, -H + D.y),
      new Phaser.Geom.Point(half + D.x, -H + D.y),
      new Phaser.Geom.Point(half, -H),
      new Phaser.Geom.Point(half, 0),
      new Phaser.Geom.Point(-half, 0),
    ].map((p) => new Phaser.Geom.Point(p.x - HOUSE_AREA.x, p.y - HOUSE_AREA.y));
    this.front.setInteractive({ hitArea: new Phaser.Geom.Polygon(outline), hitAreaCallback: Phaser.Geom.Polygon.Contains, useHandCursor: true });
    this.front.setData('scenery', true);
    this.front.setData('onTap', () => this.onHouseTap());
  }

  /** Weltpunkt aus Maßen relativ zum Fußpunkt der Vorderwand. */
  private at(x: number, y: number): { x: number; y: number } {
    return { x: this.def.x + x, y: this.def.y + y };
  }

  private nearBigHole(x: number, y: number): boolean {
    const hole = this.at(PH.bigHole.x, 0);
    return Math.abs(x - hole.x) < 120 && y > this.def.y - 70 && y < this.def.y + 120;
  }

  override accepts(_kid: Kid, x: number, y: number): boolean {
    if (this.kids.size >= PlayHouse.CAPACITY) return false;
    if (this.nearBigHole(x, y)) return true;
    const { x: dx, y: dy } = { x: x - this.def.x, y: y - this.def.y };
    return dx > -PH.half + PH.depth.x - 20 && dx < PH.half + 20 && dy > -PH.height + PH.depth.y - 120 && dy < 10;
  }

  override use(kid: Kid): void {
    kid.mode = 'playing';
    kid.seatedOn = this;
    kid.exitPoint = this.at(-60 + this.kids.size * 70, 70);
    const topFree = this.freeSeat('top') >= 0;
    if (this.nearBigHole(kid.x, kid.y) || !topFree) this.crawlIn(kid);
    else this.climbUp(kid);
  }

  private freeSeat(where: 'top' | 'inside'): number {
    const seats = where === 'top' ? PlayHouse.TOP_SEATS : PlayHouse.INSIDE_SEATS;
    const taken = new Set([...this.kids.values()].filter((s) => s.where === where).map((s) => (s as { index: number }).index));
    return seats.findIndex((_, i) => !taken.has(i));
  }

  /** Durch das große Loch hineinkrabbeln und drinnen hinsetzen. */
  private crawlIn(kid: Kid): void {
    const index = this.freeSeat('inside');
    if (index < 0) {
      this.unseat(kid);
      kid.settle();
      return;
    }
    this.kids.set(kid, { where: 'moving' });
    const hole = this.at(PH.bigHole.x, 36);
    const seat = PlayHouse.INSIDE_SEATS[index];
    const target = this.at(seat.x, seat.y);
    kid.setDepth(this.def.y + 5).setActivity('walk');
    this.scene.tweens.chain({
      targets: kid,
      tweens: [
        { x: hole.x, y: hole.y, duration: 260, ease: 'Sine.easeOut' },
        {
          x: target.x,
          y: target.y + kid.sitHeight,
          duration: 520,
          ease: 'Sine.easeInOut',
          onStart: () => kid.setDepth(this.def.y + PlayHouse.INSIDE),
        },
      ],
      onComplete: () => {
        this.kids.set(kid, { where: 'inside', index });
        kid.setActivity('sit');
        kid.giggle();
      },
    });
  }

  /** An den Sprossen der Seitenwand hochklettern und oben aufs Podest setzen. */
  private climbUp(kid: Kid): void {
    const index = this.freeSeat('top');
    this.kids.set(kid, { where: 'moving' });
    const foot = sidePoint((PH.rungs.u1 + PH.rungs.u2) / 2, 0);
    const bottom = this.at(foot.x - 30, foot.y + 60);
    const top = this.at(foot.x - 20, foot.y - PH.height + 30);
    const seat = PlayHouse.TOP_SEATS[index];
    const target = this.at(seat.x, seat.y);
    kid.setDepth(this.def.y + 2).setActivity('walk');
    this.scene.tweens.chain({
      targets: kid,
      tweens: [
        { x: bottom.x, y: bottom.y, duration: 300, ease: 'Sine.easeOut' },
        { x: top.x, y: top.y, duration: 800, ease: 'Sine.easeInOut', onStart: () => kid.setActivity('climb') },
        {
          x: target.x,
          y: target.y + kid.sitHeight,
          duration: 380,
          ease: 'Sine.easeInOut',
          onStart: () => kid.setDepth(this.def.y + PlayHouse.TOP).setActivity('sit'),
        },
      ],
      onComplete: () => {
        this.kids.set(kid, { where: 'top', index });
        kid.cheer();
      },
    });
  }

  /** Von oben die Rutsche hinunter (entlang der Kurve, liegt dabei schräg), vorne auf der Wiese landen. */
  private slideDown(kid: Kid): void {
    this.kids.set(kid, { where: 'moving' });
    const start = slidePoint(0);
    const end = slidePoint(1);
    const out = this.at(end.x + 80, end.y + 26);
    kid.exitPoint = out;
    const ride = { t: 0 };
    const placeOnSlide = () => {
      const p = slidePoint(ride.t);
      // Nach hinten gelehnt, im steilen Stück mit der Rutsche geneigt („Juhu“)
      const tilt = Phaser.Math.Clamp(slideAngle(ride.t) * 0.5, 0, 0.5);
      kid.setPosition(this.def.x + p.x, this.def.y + p.y + kid.sitHeight).setRotation(-0.3 + tilt);
    };
    this.scene.tweens.chain({
      targets: kid,
      tweens: [
        { x: this.def.x + start.x, y: this.def.y + start.y + kid.sitHeight, duration: 260, ease: 'Sine.easeInOut' },
        {
          targets: ride,
          t: 1,
          duration: 850,
          ease: 'Quad.easeIn',
          onStart: () => {
            kid.setDepth(this.def.y + end.y + 1).setActivity('slide');
          },
          onUpdate: placeOnSlide,
        },
        {
          x: out.x,
          y: out.y,
          duration: 260,
          ease: 'Quad.easeOut',
          onStart: () => {
            kid.setActivity('walk');
            kid.setRotation(0);
          },
        },
      ],
      onComplete: () => {
        this.unseat(kid);
        kid.setDepth(kid.y);
        kid.hop();
      },
    });
  }

  /** Ein Kind drinnen guckt durch das Guckloch (Kuckuck) oder winkt aus dem Bogen – abwechselnd. */
  private peekOrWave(kid: Kid): void {
    const spot = this.kids.get(kid);
    if (!spot || spot.where !== 'inside' || this.scene.tweens.isTweening(kid)) return;
    const seat = PlayHouse.INSIDE_SEATS[spot.index];
    const home = this.at(seat.x, seat.y);
    const peek = this.peekTurn++ % 2 === 0;
    let target: { x: number; y: number };
    if (peek) {
      // Stehend: der Kopf (Mitte etwa 186 px über dem Fuß) erscheint im obersten Loch
      const hole = PH.holes[0];
      target = this.at(hole.x, Math.min(hole.y + 186 * kid.def.size, -8));
      kid.setActivity('idle');
      this.scene.events.emit('sound', { kind: 'peekaboo', x: target.x });
    } else {
      const door = sidePoint(PH.arch.u, 0);
      target = this.at(door.x + 10, door.y + kid.sitHeight);
    }
    this.scene.tweens.chain({
      targets: kid,
      tweens: [
        { x: target.x, y: target.y, duration: 300, ease: 'Sine.easeOut', onComplete: () => (peek ? kid.giggle() : kid.wave(() => {})) },
        {
          x: home.x,
          y: home.y + kid.sitHeight,
          delay: 1800,
          duration: 380,
          ease: 'Sine.easeInOut',
          onStart: () => kid.setActivity('sit'),
        },
      ],
    });
  }

  /** Haus angetippt: Wer drinnen ist, guckt heraus; sonst winkt ein Kind von oben; leer klopft es hohl. */
  private onHouseTap(): void {
    const inside = [...this.kids].filter(([, s]) => s.where === 'inside').map(([k]) => k);
    if (inside.length) {
      this.peekOrWave(inside[this.peekTurn % inside.length]);
      return;
    }
    const top = [...this.kids].find(([, s]) => s.where === 'top')?.[0];
    if (top) {
      top.wave(() => {});
      return;
    }
    this.scene.events.emit('sound', { kind: 'drum', x: this.def.x });
  }

  /** Kind im Haus angetippt: oben = rutschen, drinnen = gucken/winken. */
  tap(kid: Kid): boolean {
    const spot = this.kids.get(kid);
    if (!spot) return false;
    if (spot.where === 'top') this.slideDown(kid);
    else if (spot.where === 'inside') this.peekOrWave(kid);
    return true;
  }

  unseat(kid: Kid): void {
    if (!this.kids.delete(kid)) return;
    kid.seatedOn = undefined;
    kid.exitPoint = undefined;
    kid.mode = 'idle';
    kid.setRotation(0);
  }

  override update(): void {
    for (const kid of this.kids.keys()) if (!kid.active || kid.seatedOn !== this) this.kids.delete(kid);
    this.updateBalls();
  }

  /**
   * Bälle: Durch das große Loch oder ein rundes Loch (bzw. über die Wand) kommen sie hinein und
   * bleiben drinnen liegen, an den Wänden prallen sie ab. Drinnen liegen sie zwischen den Wänden.
   */
  private updateBalls(): void {
    const scene = this.scene as PlaygroundScene;
    const { half, depth: D } = PH;
    // Tiefe u (0 = Vorderwand, 1 = Rückwand) aus der Bodenlinie; innen ist die Wand schräg versetzt
    const depthOf = (g: number) => g / D.y;
    const FRONT = 0.1;
    const BACK = 0.95;
    const inBox = (p: { x: number; g: number }) => {
      const u = depthOf(p.g);
      return u > FRONT && u < BACK && p.x > -half + D.x * u + 12 && p.x < half + D.x * u - 12;
    };
    const seen = new Set<Toy>();
    for (const toy of scene.toysOnMeadow()) {
      if (!toy.def.tags?.includes('ball') || !toy.physics.active || toy.isDragging) continue;
      seen.add(toy);
      const now = { x: toy.x - this.def.x, g: toy.physics.groundY - this.def.y, z: toy.physics.z };
      const prev = this.balls.get(toy);
      this.balls.set(toy, now);
      if (!prev) continue;
      const wasIn = inBox(prev);
      if (wasIn === inBox(now) || now.z > PH.height) continue; // über die Wand geht immer
      const uPrev = depthOf(prev.g);
      const uNow = depthOf(now.g);
      const front = (uPrev <= FRONT) !== (uNow <= FRONT);
      const back = (uPrev >= BACK) !== (uNow >= BACK);
      if (front) {
        // Mitte des Balls auf der Vorderwand in einem Loch? (großes Loch unten: ganz hindurch)
        const cy = -now.z - toy.displayHeight / 2;
        const big = PH.bigHole;
        if ([big, ...PH.holes].some((h) => Math.hypot(now.x - h.x, cy - h.y) < h.r + (h === big ? 0 : 6))) continue;
      }
      // Abprallen: zurück auf die alte Seite
      if (front || back) {
        toy.physics.groundY = this.def.y + prev.g;
        toy.physics.vdepth = -toy.physics.vdepth * 0.5;
      } else {
        toy.x = this.def.x + prev.x;
        toy.physics.vx = -toy.physics.vx * 0.5;
      }
      this.balls.set(toy, { ...prev, z: now.z });
    }
    for (const toy of this.balls.keys()) if (!seen.has(toy)) this.balls.delete(toy);
  }
}

// ---------------------------------------------------------------------------

export class Tree extends Equipment {
  private readonly image: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, def: EquipmentDef) {
    super(scene, def);
    const image = (this.image = scene.add.image(def.x, def.y, 'tree').setOrigin(0.5, 1).setDepth(def.y));
    // Nur Stamm und unterer Kronenbereich wackeln beim Antippen (Maße passend zum Platzhalter).
    const { trunk, lowerCrown } = BIG_TREE;
    image.setInteractive({
      hitArea: trunk,
      hitAreaCallback: (_area: Phaser.Geom.Rectangle, x: number, y: number) => trunk.contains(x, y) || lowerCrown.contains(x, y),
      useHandCursor: true,
    });
    // Deko: Kinder und Spielzeuge dahinter haben beim Antippen Vorrang (PlaygroundScene.touchRank).
    image.setData('scenery', true);
    image.setData('onTap', () => {
      if (scene.tweens.isTweening(image)) return;
      scene.tweens.add({
        targets: image,
        angle: { from: -3, to: 3 },
        duration: 80,
        yoyo: true,
        repeat: 3,
        onComplete: () => {
          image.setAngle(0);
        },
      });
    });
  }

  /** Im Wind wiegt sich der Baum (um den Stamm unten). */
  override update(): void {
    if (this.scene.tweens.isTweening(this.image)) return;
    const w = Math.min(1.6, windStrength());
    const target = w > 0.01 ? 1.5 * w + Math.sin(this.scene.time.now / 500) * 1.5 * w : 0;
    this.image.angle += (target - this.image.angle) * 0.05;
  }
}

export class Sandbox extends Equipment {
  constructor(scene: Phaser.Scene, def: EquipmentDef) {
    super(scene, def);
    // Liegt flach auf dem Boden -> ganz hinten, damit alles darüber gezeichnet wird.
    scene.add.image(def.x, def.y, 'sandbox').setOrigin(0.5, 1).setDepth(def.y - 120);
  }

  /** Liegt (x, y) im Sand? Großzügig: auch knapp auf dem Rand zählt. (Platzhalter 360×120) */
  contains(x: number, y: number): boolean {
    return Math.abs(x - this.def.x) < 180 && y > this.def.y - 110 && y < this.def.y + 10;
  }
}

// ---------------------------------------------------------------------------

/**
 * Ankleidekiste (#70): große Pappkiste mit Tür. Kind hineinziehen → es geht hinein und das Spiel
 * wechselt ins Ankleide-Spiel (DressUpScene). Zurück kommt es verkleidet aus der Tür.
 * Antippen der Kiste lässt die Klappen wackeln.
 */
export class DressBox extends Equipment implements Seat {
  private readonly image: Phaser.GameObjects.Image;
  private guest?: Kid;
  /** Laufende Schatten-Einfärbung (ein Zähler-Tween, hängt nicht am Kind). */
  private tintTween?: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene, def: EquipmentDef) {
    super(scene, def);
    const origin = [BOX.footX / BOX.width, BOX.footY / BOX.height] as const;
    // Das Innere liegt hinter der Vorderseite; dazwischen geht das Kind durch die Tür hinein
    scene.add.image(def.x, def.y, 'dressbox-inside').setOrigin(...origin).setDepth(def.y - 2);
    this.image = scene.add.image(def.x, def.y, 'dressbox').setOrigin(...origin).setDepth(def.y);
    const { front: F } = BOX;
    // Touch-Fläche: die Vorderseite mit den Klappen. Kinder davor haben Vorrang (Deko, touchRank).
    const area = new Phaser.Geom.Rectangle(BOX.footX + F.left, BOX.footY + F.top - 70, F.right - F.left + BOX.depth.x, -F.top + 70);
    this.image.setInteractive({ hitArea: area, hitAreaCallback: Phaser.Geom.Rectangle.Contains, useHandCursor: true });
    this.image.setData('scenery', true);
    this.image.setData('onTap', () => this.wobble(true));
  }

  /** Mitte der Tür in der Welt (Fußpunkt). */
  get doorPoint(): { x: number; y: number } {
    return { x: this.def.x + BOX.door.x, y: this.def.y };
  }

  /** Klappen und Kiste wackeln (beim Antippen mit hohlem Klopfen, sonst mit Plopp). */
  private wobble(knock = true): void {
    const img = this.image;
    if (this.scene.tweens.isTweening(img)) return;
    this.scene.tweens.add({ targets: img, scaleY: { from: 1, to: 1.04 }, duration: 110, yoyo: true, repeat: 1, ease: 'Sine.easeInOut', onComplete: () => img.setScale(1) });
    this.scene.events.emit('sound', { kind: knock ? 'drum' : 'pop', x: this.def.x });
  }

  override accepts(_kid: Kid, x: number, y: number): boolean {
    if (this.guest) return false;
    const { front: F } = BOX;
    const dx = x - this.def.x;
    const dy = y - this.def.y;
    return dx > F.left - 30 && dx < F.right + BOX.depth.x && dy > F.top - 100 && dy < 90;
  }

  /**
   * Kind geht in die Kiste: läuft zur Tür, freut sich kurz, duckt sich und verschwindet im
   * dunklen Inneren (kleiner, dunkler, nur durch die Türöffnung zu sehen). Die Kiste wackelt,
   * dann öffnet sich das Ankleide-Spiel.
   */
  override use(kid: Kid): void {
    this.guest = kid;
    kid.mode = 'hiding';
    kid.seatedOn = this;
    const door = this.doorPoint;
    kid.exitPoint = { x: door.x, y: door.y + 70 };
    const front = { x: door.x, y: door.y + 28 };
    const walk = Phaser.Math.Clamp(Phaser.Math.Distance.Between(kid.x, kid.y, front.x, front.y) * 2.2, 250, 900);
    kid.setDepth(this.def.y + 1).setActivity('walk');
    this.scene.tweens.chain({
      targets: kid,
      tweens: [
        // hinlaufen (die Beine laufen mit dem Weg)
        { x: front.x, y: front.y, duration: walk, ease: 'Sine.easeInOut' },
        // kurz aufgeregt hüpfen
        {
          y: front.y - 18,
          duration: 150,
          yoyo: true,
          ease: 'Quad.easeOut',
          onStart: () => kid.setActivity('idle').giggle(),
        },
        // ducken und hineingehen: hinter die Vorderseite, kleiner, ins Dunkle
        {
          y: door.y - 16,
          scale: 0.7,
          duration: 700,
          ease: 'Sine.easeIn',
          onStart: () => {
            kid.setDepth(this.def.y - 1).setActivity('walk');
            this.fadeTint(kid, 0, 1, 700);
          },
        },
        { alpha: 0, duration: 220 },
      ],
      onComplete: () => {
        kid.setVisible(false).setAlpha(1).setScale(1).clearTint();
        this.wobble(false);
        this.scene.time.delayedCall(260, () => {
          if (this.guest === kid) (this.scene as PlaygroundScene).openDressUp(kid, () => this.comeOut(kid));
        });
      },
    });
  }

  /** Färbt das Kind weich von hell (0) nach dunkel (1) oder umgekehrt – wie im Schatten der Kiste. */
  private fadeTint(kid: Kid, from: number, to: number, duration: number): void {
    const light = Phaser.Display.Color.ValueToColor(0xffffff);
    const dark = Phaser.Display.Color.ValueToColor(0x4a3a2e);
    this.tintTween?.stop();
    this.tintTween = this.scene.tweens.addCounter({
      from,
      to,
      duration,
      onUpdate: (tw) => {
        const c = Phaser.Display.Color.Interpolate.ColorWithColor(light, dark, 100, (tw.getValue() ?? 0) * 100);
        kid.setTint(Phaser.Display.Color.GetColor(c.r, c.g, c.b));
      },
      onComplete: () => {
        if (to === 0) kid.clearTint();
      },
    });
  }

  /** Nach dem Ankleiden: Das Kind kommt aus dem Dunkeln durch die Tür, verkleidet, und jubelt. */
  private comeOut(kid: Kid): void {
    if (this.guest !== kid || !kid.active) return;
    const door = this.doorPoint;
    kid.setPosition(door.x, door.y - 16).setScale(0.7).setAlpha(0).setVisible(true).setDepth(this.def.y - 1).setActivity('walk');
    this.fadeTint(kid, 1, 1, 1);
    this.wobble(false);
    this.scene.tweens.chain({
      targets: kid,
      tweens: [
        { alpha: 1, duration: 200 },
        {
          y: door.y + 28,
          scale: 1,
          duration: 650,
          ease: 'Sine.easeOut',
          onStart: () => this.fadeTint(kid, 1, 0, 650),
          onComplete: () => kid.setDepth(this.def.y + 1),
        },
        { y: door.y + 80, duration: 350, ease: 'Sine.easeOut' },
      ],
      onComplete: () => {
        this.unseat(kid);
        kid.clearTint().setDepth(kid.y);
        kid.cheer();
      },
    });
  }

  unseat(kid: Kid): void {
    if (this.guest !== kid) return;
    this.guest = undefined;
    kid.seatedOn = undefined;
    kid.exitPoint = undefined;
    kid.mode = 'idle';
    // Wird das Kind mitten im Hinein-/Herausgehen weggezogen, bleibt es sonst im Schatten (Zähler-Tween läuft weiter)
    this.tintTween?.stop();
    this.tintTween = undefined;
    kid.setVisible(true).setAlpha(1).clearTint();
  }

  override update(): void {
    if (this.guest && (!this.guest.active || this.guest.seatedOn !== this)) this.guest = undefined;
  }
}

// ---------------------------------------------------------------------------

export function createEquipment(scene: Phaser.Scene, def: EquipmentDef): Equipment {
  switch (def.kind) {
    case 'swing':
      return new Swing(scene, def);
    case 'playhouse':
      return new PlayHouse(scene, def);
    case 'tree':
      return new Tree(scene, def);
    case 'sandbox':
      return new Sandbox(scene, def);
    case 'dressbox':
      return new DressBox(scene, def);
  }
}
