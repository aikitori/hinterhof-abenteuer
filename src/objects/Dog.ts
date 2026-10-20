import Phaser from 'phaser';
import { DEPTH_DRAGGING, GROUND_MAX_Y, GROUND_MIN_Y, WORLD_WIDTH } from '../config';
import { DOG } from '../data/dog';
import type { PlaygroundScene } from '../scenes/PlaygroundScene';
import { environment } from '../world/environment';
import type { Kid } from './Kid';
import type { Toy } from './toys/Toy';

// Teile in Zeichenreihenfolge: Schwanz und ferne Beine hinter dem Rumpf, nahe Beine und Kopf davor.
type Part = 'tail' | 'legBF' | 'legFF' | 'body' | 'legBN' | 'legFN' | 'head';
const PARTS: Part[] = ['tail', 'legBF', 'legFF', 'body', 'legBN', 'legFN', 'head'];

interface PartState {
  x: number;
  y: number;
  angle: number;
  scaleY: number;
}
const NEUTRAL: PartState = { x: 0, y: 0, angle: 0, scaleY: 1 };

/** Gelenke relativ zum Fußpunkt (schaut nach rechts, unverkleinert). */
const RIG: Record<Part, { texture: string; x: number; y: number; originX: number; originY: number; far?: boolean; scale?: number }> = {
  tail: { texture: 'dog-tail', x: -86, y: -130, originX: 1, originY: 0.5 },
  legBF: { texture: 'dog-leg', x: -44, y: -86, originX: 0.5, originY: 0.08, far: true },
  legFF: { texture: 'dog-leg', x: 72, y: -86, originX: 0.5, originY: 0.08, far: true },
  body: { texture: 'dog-body', x: 0, y: -118, originX: 0.5, originY: 0.5 },
  legBN: { texture: 'dog-leg', x: -60, y: -84, originX: 0.5, originY: 0.08 },
  legFN: { texture: 'dog-leg', x: 56, y: -84, originX: 0.5, originY: 0.08 },
  head: { texture: 'dog-head', x: 80, y: -144, originX: 0.32, originY: 0.82, scale: 1.15 },
};
const HEAD_SCALE = RIG.head.scale ?? 1;

type DogPose = 'stand' | 'sit' | 'lie' | 'jump';

/** Posen als Abweichung vom Stehen (Winkel in Grad, + = im Uhrzeigersinn). */
const POSES: Record<DogPose, Partial<Record<Part, Partial<PartState>>>> = {
  stand: { tail: { angle: 22 } },
  // Sitzen: Rumpf um 30° aufgerichtet, Hinterteil am Boden, Hinterbeine nach vorn gefaltet
  sit: {
    body: { x: -12, y: 36, angle: -30 },
    head: { x: -36, y: 0, angle: -8 },
    tail: { x: -6, y: 118, angle: -6 },
    legFN: { x: -3, y: 3, scaleY: 0.97 },
    legFF: { x: -6, y: -4, scaleY: 1.05 },
    legBN: { x: 13, y: 60, angle: -90, scaleY: 0.6 },
    legBF: { x: 10, y: 52, angle: -90, scaleY: 0.6 },
  },
  lie: {
    body: { y: 71 },
    head: { x: 4, y: 71, angle: 4 },
    tail: { y: 118, angle: -4 },
    legFN: { y: 71, angle: -86, scaleY: 0.85 },
    legFF: { x: -10, y: 69, angle: -80, scaleY: 0.8 },
    legBN: { y: 71, angle: -70, scaleY: 0.55 },
    legBF: { y: 69, angle: -64, scaleY: 0.55 },
  },
  jump: {
    body: { angle: -16 },
    head: { y: -14, angle: -22 },
    tail: { angle: -10 },
    legFN: { angle: -55 },
    legFF: { angle: -45 },
    legBN: { angle: 45 },
    legBF: { angle: 38 },
  },
};

type Mode = 'idle' | 'walk' | 'sniff' | 'chase' | 'carry' | 'catch' | 'shake' | 'bath' | 'drag' | 'fall';

// So schnell folgen die Gelenke der Bewegung (1/s).
const FOLLOW_RATE = 18;

/**
 * Der Hund im Hinterhof (schwarzer Labrador). Lebt immer auf der Wiese: streunt herum, schnüffelt,
 * setzt sich, legt sich hin, stupst Kinder an, schläft nachts. Antippen = bellen, ziehen = baumeln.
 * Mit Gegenständen: apportiert geworfene Bälle, fängt Frisbee und Bumerang im Sprung und bringt sie
 * dem nächsten Kind. Wasser (Gießkanne, Sprenger, Planschbecken, Pfützen) macht ihn nass – danach
 * schüttelt er sich, und Kinder daneben kichern. Gespeichert als Weltzustand „dog“.
 */
export class Dog extends Phaser.GameObjects.Container {
  private readonly parts = {} as Record<Part, Phaser.GameObjects.Image>;
  private readonly base = {} as Record<Part, PartState>;
  private readonly motion = {} as Record<Part, PartState>;
  private blend?: { from: Record<Part, PartState>; to: Record<Part, PartState>; elapsed: number; duration: number };
  private pose: DogPose = 'stand';
  private facing = 1;

  private mode: Mode = 'idle';
  private clock = 0;
  private travel = 0;
  private moved = false;
  private running = false;
  /** Höhe über dem Boden (Hüpfer, Sprung) – y bleibt dabei die Bodenlinie. */
  private lift = 0;
  private modeUntil = 0;
  private nextIdleAt = 2000;
  private target?: { x: number; y: number; speed: number; arrive: () => void };
  private chased?: { toy: Toy; since: number };
  private carrying?: Toy;
  /** Gerade selbst abgelegt: nicht gleich wieder jagen. */
  private dropped?: { toy: Toy; until: number };
  private pool?: Toy;
  private wetAt?: number;
  private nextPuddle = 0;
  private nextDrop = 0;
  private happyUntil = 0;
  private openUntil = 0;
  private snapUntil = 0;
  private awakeUntil = 0;

  constructor(
    scene: PlaygroundScene,
    x: number,
    y: number,
  ) {
    super(scene, x, y);
    for (const id of PARTS) {
      const r = RIG[id];
      const img = scene.add.image(0, 0, r.texture).setOrigin(r.originX, r.originY);
      if (r.far) img.setTint(0x9a9a9a); // ferne Beine etwas dunkler
      this.parts[id] = img;
      this.base[id] = { ...NEUTRAL, ...POSES.stand[id] };
      this.motion[id] = { ...NEUTRAL };
      this.add(img);
    }
    this.applyParts();
    const w = 270;
    const h = 210;
    this.setSize(w, h).setScale(DOG.scale).setDepth(y);
    scene.add.existing(this);
    this.addToUpdateList();
    // Wie beim Kind: Container rechnen die Touch-Fläche ab ihrer Mitte, Fußpunkt unten Mitte.
    this.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(0, -h / 2, w, h),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      draggable: true,
      useHandCursor: true,
    });
    this.setData('onTap', () => this.tapped());
    const onThrown = (t: Toy) => this.onThrown(t);
    scene.events.on('toy-thrown', onThrown);
    this.once(Phaser.GameObjects.Events.DESTROY, () => scene.events.off('toy-thrown', onThrown));

    scene.registerWorldState('dog', {
      save: () => this.restPosition(),
      load: (v) => {
        if (typeof v !== 'object' || v === null) return;
        const p = v as { x?: unknown; y?: unknown };
        if (typeof p.x !== 'number' || typeof p.y !== 'number' || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return;
        this.setPosition(Phaser.Math.Clamp(p.x, 80, WORLD_WIDTH - 80), Phaser.Math.Clamp(p.y, GROUND_MIN_Y, GROUND_MAX_Y));
        this.setDepth(this.y);
      },
    });
  }

  private get playground(): PlaygroundScene {
    return this.scene as PlaygroundScene;
  }

  /** Wo er steht (fürs Speichern): auf der Wiese, nie in der Luft. */
  restPosition(): { x: number; y: number } {
    return {
      x: Math.round(Phaser.Math.Clamp(this.x, 80, WORLD_WIDTH - 80)),
      y: Math.round(Phaser.Math.Clamp(this.y, GROUND_MIN_Y, GROUND_MAX_Y)),
    };
  }

  /** Fläche der ganzen Figur in der Welt (für Wasserstrahl und Co.). */
  area(): Phaser.Geom.Rectangle {
    const w = 250 * DOG.scale;
    const h = 190 * DOG.scale;
    return new Phaser.Geom.Rectangle(this.x - w / 2, this.y - this.lift * DOG.scale - h, w, h);
  }

  private get sleeping(): boolean {
    return this.mode === 'idle' && environment.timeOfDay === 'night' && this.clock >= this.awakeUntil && !this.carrying;
  }

  // --- Von außen -----------------------------------------------------------

  /** Schläft er gerade (nachts liegend)? */
  get asleep(): boolean {
    return this.sleeping;
  }

  /** Sieht eine Katze auf der Wiese: bellt und rennt ein Stück hinterher (nur wenn er gerade nichts anderes tut). */
  chaseCat(x: number, y: number): void {
    if (!this.canFetch) return;
    this.facing = x > this.x ? 1 : -1;
    this.bark();
    this.walkTo(x - this.facing * 140, y, DOG.runSpeed * 0.7, () => {
      this.bark();
      this.toIdle();
    });
  }

  /** Wasser trifft ihn (Gießkanne, Sprenger): schnappt danach, wird nass. jump: kleiner Luftsprung. */
  soak(jump = false): void {
    if (this.mode === 'drag' || this.mode === 'fall') return;
    this.wetAt = this.clock;
    this.awakeUntil = Math.max(this.awakeUntil, this.clock + DOG.awakeMs);
    if (this.clock < this.snapUntil + 500) return;
    this.snapUntil = this.clock + 450;
    this.openUntil = this.clock + 450;
    this.happyUntil = this.clock + 2000;
    if (jump) this.hop(60);
  }

  handleDragStart(): void {
    this.scene.tweens.killTweensOf(this);
    this.dropCarried(0);
    this.chased = undefined;
    this.target = undefined;
    this.pool = undefined;
    this.lift = 0;
    this.mode = 'drag';
    this.setPose('stand', 200);
    this.setScale(DOG.scale * 1.06).setDepth(DEPTH_DRAGGING);
    this.happyUntil = Infinity;
    this.awakeUntil = this.clock + DOG.awakeMs;
  }

  handleDrag(_pointer: Phaser.Input.Pointer, x: number, y: number): void {
    this.setPosition(x, y);
  }

  /** Losgelassen: ins Planschbecken oder auf die Wiese fallen. */
  release(): void {
    this.setScale(DOG.scale);
    this.happyUntil = this.clock + 1500;
    this.x = Phaser.Math.Clamp(this.x, 80, WORLD_WIDTH - 80);
    const pool = this.playground
      .toysOnMeadow()
      .find((t) => t.def.behaviors.includes('pool') && !t.isDragging && t.getBounds().contains(this.x, Math.max(this.y, t.y - 40)));
    if (pool) {
      this.startBath(pool);
      return;
    }
    const targetY = Phaser.Math.Clamp(this.y, GROUND_MIN_Y, GROUND_MAX_Y);
    const landed = () => {
      this.mode = 'idle';
      this.nextIdleAt = this.clock + 1500;
      this.checkPuddle(true);
    };
    if (this.y >= targetY) {
      this.y = targetY;
      this.setDepth(this.y);
      landed();
      return;
    }
    this.mode = 'fall';
    this.scene.tweens.add({
      targets: this,
      y: targetY,
      duration: 250 + (targetY - this.y) * 0.8,
      ease: 'Bounce.easeOut',
      onUpdate: () => this.setDepth(this.y),
      onComplete: landed,
    });
  }

  // --- Antippen ---------------------------------------------------------------

  private tapped(): void {
    if (this.mode === 'drag' || this.mode === 'fall' || this.mode === 'catch') return;
    if (this.sleeping) {
      // Aufwachen: aufstehen und wedeln
      this.awakeUntil = this.clock + DOG.awakeMs;
      this.setPose('stand', 400);
      this.happyUntil = this.clock + 2000;
      this.nextIdleAt = this.clock + 2500;
      return;
    }
    this.awakeUntil = Math.max(this.awakeUntil, this.clock + DOG.awakeMs);
    if (this.carrying && this.mode === 'carry') {
      this.dropCarried(60);
      this.mode = 'idle';
    }
    if (this.mode === 'idle' || this.mode === 'sniff') {
      this.mode = 'idle';
      this.setPose('stand', 200);
      this.nextIdleAt = this.clock + 2000;
    }
    this.bark();
    this.hop(34);
  }

  private bark(): void {
    this.openUntil = this.clock + 320;
    this.happyUntil = this.clock + 1800;
    this.scene.events.emit('sound', { kind: 'bark', x: this.x });
  }

  /** Kleiner Hüpfer (y bleibt die Bodenlinie). */
  private hop(height: number): void {
    if (this.lift > 0 || this.mode === 'bath') return;
    this.scene.tweens.add({ targets: this, lift: height, duration: 170, yoyo: true, ease: 'Quad.easeOut' });
  }

  // --- Jedes Bild ----------------------------------------------------------

  preUpdate(_time: number, delta: number): void {
    const dt = Math.min(delta, 50);
    this.clock += dt;
    this.moved = false;
    this.running = false;
    if (this.mode !== 'drag' && this.mode !== 'fall' && this.mode !== 'catch') this.think(dt);
    this.animate(dt);
  }

  private think(dt: number): void {
    const scene = this.playground;
    // Hat ihm jemand das Getragene weggenommen?
    const c = this.carrying;
    if (c && (!c.active || c.isDragging || c.heldBy || !scene.toysOnMeadow().includes(c))) {
      if (c.active) c.restY = undefined;
      this.carrying = undefined;
      if (this.mode === 'carry') this.toIdle();
    }
    // Nass und nicht mehr im Wasser: schütteln
    if (this.wetAt !== undefined && this.mode !== 'bath' && this.mode !== 'shake' && this.clock >= this.wetAt + DOG.shakeDelay) {
      this.startShake();
    }
    // Fliegt oder rollt etwas zum Apportieren (z. B. gekickt)?
    if (this.canFetch) {
      const toy = this.thrownToy();
      if (toy) this.startChase(toy);
    }

    switch (this.mode) {
      case 'idle':
        if (this.sleeping) {
          if (this.pose !== 'lie') this.setPose('lie', 900);
        } else if (this.clock >= this.nextIdleAt) {
          this.pickIdle();
        }
        break;
      case 'walk':
        if (this.target && this.stepTowards(this.target.x, this.target.y, this.target.speed, dt)) {
          const arrive = this.target.arrive;
          this.target = undefined;
          arrive();
        }
        break;
      case 'sniff':
        if (this.clock >= this.modeUntil) this.toIdle();
        break;
      case 'chase':
        this.chase(dt);
        break;
      case 'carry':
        this.deliver(dt);
        break;
      case 'shake':
        this.shaking();
        break;
      case 'bath':
        this.bathing();
        break;
    }
    if (this.moved) this.checkPuddle(false);
  }

  private toIdle(pose: DogPose = 'stand'): void {
    this.mode = 'idle';
    this.target = undefined;
    this.chased = undefined;
    this.setPose(pose, 300);
    this.nextIdleAt = this.clock + Phaser.Math.Between(DOG.idleMin, DOG.idleMax);
  }

  /** Was als Nächstes? Herumstreunen, zu einem Kind, schnüffeln, sitzen oder liegen. */
  private pickIdle(): void {
    const r = Math.random();
    this.nextIdleAt = this.clock + Phaser.Math.Between(DOG.idleMin, DOG.idleMax);
    if (r < 0.35) {
      const x = Phaser.Math.Clamp(this.x + Phaser.Math.Between(-DOG.wanderRange, DOG.wanderRange), 80, WORLD_WIDTH - 80);
      const y = Phaser.Math.Between(GROUND_MIN_Y + 30, GROUND_MAX_Y - 10);
      this.walkTo(x, y, DOG.trotSpeed, () => this.toIdle());
    } else if (r < 0.55) {
      const kid = this.nearestKid(900);
      if (kid) {
        const side = Math.sign(this.x - kid.x) || 1;
        this.walkTo(kid.x + side * (DOG.nuzzleGap + this.headReach), kid.y + 4, DOG.trotSpeed, () => {
          // Kind anstupsen: es kichert, der Hund wedelt
          this.facing = kid.x > this.x ? 1 : -1;
          this.happyUntil = this.clock + 2500;
          this.snapUntil = this.clock + 300;
          kid.giggle();
          this.toIdle('sit');
        });
      }
    } else if (r < 0.7) {
      this.mode = 'sniff';
      this.modeUntil = this.clock + 2600;
      this.setPose('stand', 300);
    } else {
      this.setPose(r < 0.85 ? 'sit' : 'lie', 500);
    }
  }

  private walkTo(x: number, y: number, speed: number, arrive: () => void): void {
    this.mode = 'walk';
    this.target = { x: Phaser.Math.Clamp(x, 80, WORLD_WIDTH - 80), y: Phaser.Math.Clamp(y, GROUND_MIN_Y, GROUND_MAX_Y), speed, arrive };
    this.setPose('stand', 250);
  }

  /** Einen Schritt Richtung (x, y). true = angekommen. */
  private stepTowards(x: number, y: number, speed: number, dt: number): boolean {
    const dx = x - this.x;
    const dy = y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 6) return true;
    const step = Math.min(dist, (speed * dt) / 1000);
    this.x += (dx / dist) * step;
    this.y += (dy / dist) * step;
    if (Math.abs(dx) > 4) this.facing = dx > 0 ? 1 : -1;
    this.setDepth(this.y);
    this.travel += step;
    this.moved = true;
    this.running = speed > 300;
    if (this.pose !== 'stand') this.setPose('stand', 200);
    return false;
  }

  private nearestKid(range: number): Kid | undefined {
    let best: Kid | undefined;
    let bestDist = range;
    for (const kid of this.playground.kidsOnMeadow()) {
      if (!kid.visible || kid.mode !== 'idle') continue;
      const d = Math.abs(kid.x - this.x);
      if (d < bestDist) {
        best = kid;
        bestDist = d;
      }
    }
    return best;
  }

  // --- Apportieren ---------------------------------------------------------

  private get canFetch(): boolean {
    return (this.mode === 'idle' || this.mode === 'walk' || this.mode === 'sniff') && !this.carrying && !this.sleeping;
  }

  /** Ein Spielzeug wurde geworfen (Ereignis 'toy-thrown'): hinterher! */
  private onThrown(t: Toy): void {
    if (this.canFetch && Dog.fetchable(t) && Math.abs(t.x - this.x) <= DOG.fetchRange) this.startChase(t);
  }

  private startChase(toy: Toy): void {
    this.chased = { toy, since: this.clock };
    this.mode = 'chase';
    this.target = undefined;
    this.setPose('stand', 150);
    this.bark();
  }

  private static fetchable(t: Toy): boolean {
    return (t.def.tags?.includes('ball') ?? false) || t.def.behaviors.includes('glide') || t.def.behaviors.includes('boomerang');
  }

  /** Ein gerade geworfenes, gekicktes oder fliegendes Spielzeug in Reichweite. */
  private thrownToy(): Toy | undefined {
    for (const t of this.playground.toysOnMeadow()) {
      if (t === this.dropped?.toy && this.clock < this.dropped.until) continue;
      if (!Dog.fetchable(t) || t.isDragging || t.heldBy || !t.visible || !t.physics.active) continue;
      const ph = t.physics;
      if (Math.hypot(ph.vx, ph.vz) < 220 && ph.z < 25) continue;
      if (Math.abs(t.x - this.x) > DOG.fetchRange) continue;
      return t;
    }
    return undefined;
  }

  /** So weit vor der Mitte ist das Maul (waagerecht, Welt-px). */
  private get headReach(): number {
    return (RIG.head.x + DOG.mouth.dx * HEAD_SCALE) * DOG.scale;
  }

  /** Wo das Maul gerade ist (Welt), abhängig von Pose, Blickrichtung und Sprung. */
  private mouthPoint(): { x: number; y: number } {
    const head = RIG.head;
    const b = this.base.head;
    const m = this.motion.head;
    const nx = head.x + b.x + m.x;
    const ny = head.y + b.y + m.y - this.lift;
    const rad = Phaser.Math.DegToRad(b.angle + m.angle);
    const mx = DOG.mouth.dx * HEAD_SCALE;
    const my = DOG.mouth.dy * HEAD_SCALE;
    const lx = nx + mx * Math.cos(rad) - my * Math.sin(rad);
    const ly = ny + mx * Math.sin(rad) + my * Math.cos(rad);
    return { x: this.x + this.facing * lx * this.scaleX, y: this.y + ly * this.scaleY };
  }

  private chase(dt: number): void {
    const chased = this.chased;
    const t = chased?.toy;
    if (!chased || !t || !t.active || t.isDragging || t.heldBy || this.clock - chased.since > DOG.chaseTimeout) {
      this.toIdle('sit');
      return;
    }
    const ph = t.physics;
    const groundY = ph.active ? ph.groundY : t.y;
    const airborne = ph.active && ph.z > 0;
    const reachX = this.headReach;
    const mouthX = this.x + this.facing * reachX;
    // In der Luft fangen: Sprung zum Spielzeug
    if (
      airborne &&
      Math.abs(t.x - mouthX) < DOG.catchReach &&
      Math.abs(groundY - this.y) < DOG.catchDepth &&
      ph.z >= DOG.catchHeightMin &&
      ph.z <= DOG.catchHeightMax
    ) {
      this.catchInAir(t);
      return;
    }
    // Liegt es (fast) still und ist das Maul dran: aufheben
    const resting = !ph.active || (!airborne && Math.abs(ph.vx) < 120);
    if (resting && Math.abs(t.x - mouthX) < 45 && Math.abs(groundY - this.y) < 40) {
      this.startCarry(t);
      return;
    }
    // Hinlaufen, so dass das Maul am Spielzeug ist
    const side = Math.sign(t.x - this.x) || this.facing;
    this.stepTowards(t.x - side * reachX, groundY, DOG.runSpeed, dt);
  }

  private catchInAir(t: Toy): void {
    this.mode = 'catch';
    this.chased = undefined;
    this.setPose('jump', 120);
    const height = Phaser.Math.Clamp(t.physics.z * 0.9, 50, 200);
    this.scene.tweens.add({
      targets: this,
      lift: height,
      duration: 220,
      yoyo: true,
      ease: 'Quad.easeOut',
      onYoyo: () => {
        if (t.active && !t.isDragging && !t.heldBy) {
          this.carrying = t;
          t.physics.stop();
          this.scene.events.emit('sound', { kind: 'dog-catch', x: this.x });
        }
      },
      onComplete: () => {
        this.lift = 0;
        if (this.carrying === t) this.startCarry(t);
        else this.toIdle();
      },
    });
  }

  private startCarry(t: Toy): void {
    this.carrying = t;
    this.chased = undefined;
    t.physics.stop();
    t.setAngle(0);
    t.spin = 0;
    this.mode = 'carry';
    this.happyUntil = Infinity;
    this.setPose('stand', 200);
  }

  /** Bringt das Getragene zum nächsten Kind (oder legt es ab, wenn keins da ist). */
  private deliver(dt: number): void {
    const kid = this.nearestKid(DOG.deliverRange);
    if (!kid) {
      this.dropCarried(0);
      this.toIdle('lie');
      return;
    }
    const side = Math.sign(this.x - kid.x) || 1;
    const x = kid.x + side * (DOG.deliverGap + this.headReach);
    if (!this.stepTowards(x, kid.y + 4, DOG.runSpeed * 0.7, dt)) return;
    // Angekommen: zum Kind drehen, vor ihm ablegen, das Kind freut sich
    this.facing = kid.x > this.x ? 1 : -1;
    this.dropCarried(40);
    kid.hop();
    this.happyUntil = this.clock + 3000;
    this.toIdle('sit');
  }

  /** Lässt das Getragene fallen (vx: kleiner Schubs in Blickrichtung). */
  private dropCarried(vx: number): void {
    const t = this.carrying;
    this.carrying = undefined;
    if (!t?.active) return;
    t.restY = undefined;
    this.dropped = { toy: t, until: this.clock + 2500 };
    t.physics.launch(this.facing * vx, -140, Phaser.Math.Clamp(this.y + 6, GROUND_MIN_Y, GROUND_MAX_Y));
  }

  // --- Wasser ----------------------------------------------------------------

  private checkPuddle(landed: boolean): void {
    if (this.clock < this.nextPuddle || !this.playground.weather.puddleAt(this.x, this.y)) return;
    this.nextPuddle = this.clock + 1500;
    this.splash(this.x, this.y, landed ? 14 : 6);
    this.scene.events.emit('sound', { kind: 'splash', x: this.x });
    this.wetAt = this.clock;
    this.happyUntil = this.clock + 2000;
  }

  private startBath(pool: Toy): void {
    this.pool = pool;
    this.mode = 'bath';
    this.modeUntil = this.clock + 2400;
    // Liegt im Wasser und paddelt
    this.setPose('lie', 150);
    this.setPosition(pool.x + Phaser.Math.Between(-40, 40), pool.y - 14);
    this.setDepth(pool.depth + 0.5);
    this.splash(this.x, this.y - 20, 16);
    this.scene.events.emit('sound', { kind: 'splash', x: this.x });
    this.happyUntil = Infinity;
    this.openUntil = this.clock + 2400;
  }

  private bathing(): void {
    const pool = this.pool;
    if (!pool?.active || pool.isDragging || !this.playground.toysOnMeadow().includes(pool)) {
      this.pool = undefined;
      this.wetAt = this.clock;
      this.y = Phaser.Math.Clamp(this.y + 30, GROUND_MIN_Y, GROUND_MAX_Y);
      this.toIdle();
      return;
    }
    this.setDepth(pool.depth + 0.5);
    if (this.clock >= this.nextDrop) {
      this.nextDrop = this.clock + 350;
      this.splash(this.x + this.facing * 40, this.y - 20, 3);
    }
    if (this.clock < this.modeUntil) return;
    // Mit einem Satz hinaus, neben das Becken
    const side = Math.random() < 0.5 ? -1 : 1;
    const x = Phaser.Math.Clamp(pool.x + side * (pool.displayWidth / 2 + 110), 80, WORLD_WIDTH - 80);
    const y = Phaser.Math.Clamp(pool.y + 20, GROUND_MIN_Y, GROUND_MAX_Y);
    this.pool = undefined;
    this.facing = side;
    this.mode = 'catch'; // denkt nicht, solange er springt
    this.setPose('jump', 120);
    this.splash(this.x, this.y - 20, 10);
    this.scene.tweens.add({ targets: this, lift: 90, duration: 230, yoyo: true, ease: 'Quad.easeOut' });
    this.scene.tweens.add({
      targets: this,
      x,
      y,
      duration: 460,
      onUpdate: () => this.setDepth(Math.max(this.y, pool.depth + 0.5)),
      onComplete: () => {
        this.lift = 0;
        this.setDepth(this.y);
        this.wetAt = this.clock - DOG.shakeDelay / 2;
        this.toIdle();
      },
    });
  }

  private startShake(): void {
    this.wetAt = undefined;
    this.dropCarried(0);
    this.mode = 'shake';
    this.modeUntil = this.clock + DOG.shakeMs;
    this.target = undefined;
    this.chased = undefined;
    this.setPose('stand', 150);
    this.scene.events.emit('sound', { kind: 'dog-shake', x: this.x });
    // Kinder in der Nähe bekommen Spritzer ab und kichern
    this.playground
      .kidsOnMeadow()
      .filter((k) => Math.abs(k.x - this.x) < DOG.shakeReach && Math.abs(k.y - this.y) < 120)
      .forEach((k, i) => this.scene.time.delayedCall(200 + i * 120, () => k.active && k.giggle()));
  }

  private shaking(): void {
    if (this.clock >= this.nextDrop) {
      this.nextDrop = this.clock + 60;
      const body = this.area();
      this.splash(body.centerX, body.centerY, 3, true);
    }
    if (this.clock >= this.modeUntil) {
      this.happyUntil = this.clock + 1500;
      this.toIdle();
    }
  }

  /** Wassertropfen fliegen auf (wide: weit zu beiden Seiten, beim Schütteln). */
  private splash(x: number, y: number, count: number, wide = false): void {
    for (let i = 0; i < count; i++) {
      const drop = this.scene.add.circle(x, y, Phaser.Math.Between(3, 7), 0x8ecae6).setDepth(this.depth + 1);
      const a = wide ? Phaser.Math.FloatBetween(-Math.PI, 0) : -Math.PI / 2 + Phaser.Math.FloatBetween(-1.2, 1.2);
      const r = wide ? Phaser.Math.Between(80, DOG.shakeReach) : Phaser.Math.Between(40, 110);
      this.scene.tweens.add({
        targets: drop,
        x: x + Math.cos(a) * r,
        y: y + Math.sin(a) * r * 0.5 + 60,
        alpha: 0,
        duration: Phaser.Math.Between(400, 650),
        ease: 'Quad.easeOut',
        onComplete: () => drop.destroy(),
      });
    }
  }

  // --- Bewegung der Teile ----------------------------------------------------

  private setPose(pose: DogPose, ms: number): void {
    if (this.pose === pose) return;
    this.pose = pose;
    const to = {} as Record<Part, PartState>;
    const from = {} as Record<Part, PartState>;
    for (const id of PARTS) {
      to[id] = { ...NEUTRAL, ...POSES[pose][id] };
      from[id] = { ...this.base[id] };
    }
    this.blend = { from, to, elapsed: 0, duration: ms };
  }

  private animate(dt: number): void {
    // Grundpose überblenden
    const b = this.blend;
    if (b) {
      b.elapsed += dt;
      const k = Phaser.Math.Easing.Sine.InOut(Math.min(1, b.elapsed / b.duration));
      for (const id of PARTS) {
        const f = b.from[id];
        const e = b.to[id];
        const s = this.base[id];
        s.x = f.x + (e.x - f.x) * k;
        s.y = f.y + (e.y - f.y) * k;
        s.angle = f.angle + (e.angle - f.angle) * k;
        s.scaleY = f.scaleY + (e.scaleY - f.scaleY) * k;
      }
      if (b.elapsed >= b.duration) this.blend = undefined;
    }

    // Bewegung obendrauf
    const want = this.wantedMotion();
    const k = 1 - Math.exp(-FOLLOW_RATE * (dt / 1000));
    for (const id of PARTS) {
      const w = want[id];
      const m = this.motion[id];
      m.x += ((w?.x ?? 0) - m.x) * k;
      m.y += ((w?.y ?? 0) - m.y) * k;
      m.angle += ((w?.angle ?? 0) - m.angle) * k;
      m.scaleY += ((w?.scaleY ?? 1) - m.scaleY) * k;
    }

    const face = this.sleeping && this.pose === 'lie' ? 'sleep' : this.clock < this.openUntil || this.carrying ? 'open' : 'normal';
    this.parts.head.setTexture(face === 'normal' ? 'dog-head' : `dog-head-${face}`);
    this.applyParts();

    // Getragenes sitzt im Maul
    const t = this.carrying;
    if (t?.active) {
      const mouth = this.mouthPoint();
      t.physics.stop();
      t.restY = Phaser.Math.Clamp(this.y, GROUND_MIN_Y, GROUND_MAX_Y);
      t.setPosition(mouth.x, mouth.y + t.displayHeight * 0.5).setDepth(this.depth + 0.5);
    }
  }

  private wantedMotion(): Partial<Record<Part, Partial<PartState>>> {
    const t = this.clock / 1000;
    const out: Partial<Record<Part, Partial<PartState>>> = {};
    const add = (id: Part, d: Partial<PartState>) => {
      const o = (out[id] ??= {});
      o.x = (o.x ?? 0) + (d.x ?? 0);
      o.y = (o.y ?? 0) + (d.y ?? 0);
      o.angle = (o.angle ?? 0) + (d.angle ?? 0);
      if (d.scaleY !== undefined) o.scaleY = (o.scaleY ?? 1) * d.scaleY;
    };

    // Schwanz wedelt – freudig schnell und weit
    const happy = this.clock < this.happyUntil;
    if (!this.sleeping) add('tail', { angle: Math.sin(t * (happy ? 17 : 7)) * (happy ? 30 : 9) });

    if (this.mode === 'drag') {
      // Beine baumeln
      const d = Math.sin(t * 7) * 10;
      add('legFN', { angle: 20 + d });
      add('legFF', { angle: 14 - d });
      add('legBN', { angle: -12 + d });
      add('legBF', { angle: -18 - d });
      add('head', { angle: -6 });
    } else if (this.mode === 'shake') {
      const s = Math.sin(t * 46);
      add('body', { angle: 7 * s });
      add('head', { angle: 22 * Math.sin(t * 46 + 0.7) });
      add('tail', { angle: 30 * s });
    } else if (this.mode === 'bath') {
      // Paddeln (Beine hinter dem Beckenrand)
      const s = Math.sin(t * 12);
      add('legFN', { angle: -30 * s });
      add('legFF', { angle: 30 * s });
      add('legBN', { angle: 25 * s });
      add('legBF', { angle: -25 * s });
      add('head', { angle: -8, y: 3 * Math.sin(t * 6) });
    } else if (this.moved) {
      const len = this.running ? 20 : 13;
      const amp = this.running ? 42 : 26;
      const s = Math.sin(this.travel / len);
      add('legFN', { angle: amp * s });
      add('legBF', { angle: amp * s });
      add('legFF', { angle: -amp * s });
      add('legBN', { angle: -amp * s });
      add('body', { y: -Math.abs(s) * (this.running ? 6 : 3), angle: this.running ? -2 * s : 0 });
      add('head', { angle: 3 * s + (this.mode === 'chase' ? -8 : 0) });
    } else if (this.mode === 'sniff') {
      add('head', { angle: 28 + Math.sin(t * 16) * 4, y: 6 });
    } else if (this.sleeping) {
      add('body', { y: Math.sin(t * 1.6) * 1.5 });
      add('head', { angle: 10 });
    } else {
      add('body', { y: Math.sin(t * 2.4) * 1.2 });
    }
    // Bellen / nach Wasser schnappen: Kopf hoch
    if (this.clock < this.snapUntil) add('head', { angle: -22 });
    else if (this.clock < this.openUntil && this.mode !== 'bath') add('head', { angle: -12 });
    return out;
  }

  /** Setzt die Teile nach Rig, Pose und Bewegung; schaut er nach links, wird alles gespiegelt. */
  private applyParts(): void {
    const m = this.facing;
    for (const id of PARTS) {
      const r = RIG[id];
      const b = this.base[id];
      const d = this.motion[id];
      this.parts[id]
        // Hüpfer und Sprünge heben alles an (y bleibt die Bodenlinie)
        .setPosition((r.x + b.x + d.x) * m, r.y + b.y + d.y - this.lift)
        .setAngle((b.angle + d.angle) * m)
        .setFlipX(m < 0)
        .setOrigin(m < 0 ? 1 - r.originX : r.originX, r.originY)
        .setScale(r.scale ?? 1, (r.scale ?? 1) * b.scaleY * d.scaleY);
    }
  }
}
