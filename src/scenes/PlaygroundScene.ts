import Phaser from 'phaser';
import {
  DRAG_THRESHOLD,
  EDGE_SCROLL_SPEED,
  EDGE_SCROLL_ZONE,
  GAME_WIDTH,
  WORLD_WIDTH,
  GROUND_MAX_Y,
  GROUND_MIN_Y,
  MAX_OBJECTS,
} from '../config';
import { CHARACTERS, getCharacterDef, type CharacterDef, type CharacterId } from '../data/characters';
import { EQUIPMENT, GARDEN_GATE, PLACED_KIDS, PLACED_TOYS, TOY_BOX } from '../data/playground';
import { getToyDef, TOYS, type ToyDef } from '../data/toys';
import { DOG } from '../data/dog';
import { createEquipment, Sandbox, type Equipment } from '../objects/Equipment';
import { Bunker } from '../objects/Bunker';
import { Dog } from '../objects/Dog';
import { Cat, Cats } from '../objects/Cat';
import { Fairy, fairySpot } from '../objects/Fairy';
import { FAIRIES, MAX_FAIRIES, type FairyId } from '../data/brew';
import type { BrewData } from './BrewScene';
import type { PongData } from './PongScene';
import { Garden } from '../objects/Garden';
import { Photos } from '../objects/Photos';
import { KidMakeup } from '../world/KidMakeup';
import { GardenGate } from '../objects/GardenGate';
import { Kid } from '../objects/Kid';
import { LightLayer } from '../world/LightLayer';
import { Backdrop } from '../world/Backdrop';
import { FelixGarden } from '../world/FelixGarden';
import { ToyBox } from '../objects/ToyBox';
import { Toy } from '../objects/toys/Toy';
import { AutoSave } from '../save/AutoSave';
import { parseOutfit, type Outfit } from '../data/costumes';
import type { DressUpData } from './DressUpScene';
import type { AsteroidData } from './AsteroidScene';
import type { MakeupData } from './MakeupScene';
import type { GrillData } from './GrillScene';
import type { ChalkData } from './ChalkScene';
import { TerraceGate } from '../objects/TerraceGate';
import { TERRACE_GATE } from '../data/chalk';
import type { CircuitData } from './CircuitScene';
import type { SnackData } from './SnackScene';
import { DayCycle } from '../world/DayCycle';
import { Weather } from '../world/Weather';
import { Space } from '../world/Space';
import { CameraControl } from '../world/CameraControl';
import { SoundSystem } from '../audio/Sound';
import { loadSave, SAVE_VERSION, type SaveData } from '../save/storage';

/** Ein Stück Weltzustand, das mitgespeichert wird (Tageszeit, Wetter, …). */
/** Setzt ein gezogenes Objekt an (x, y) in Weltkoordinaten. */
export type DragMove = (pointer: Phaser.Input.Pointer, x: number, y: number) => void;

export interface WorldState {
  save(): unknown;
  /** Bekommt den gespeicherten Wert – kann alles sein, selbst prüfen! */
  load(value: unknown): void;
}

export class PlaygroundScene extends Phaser.Scene {
  private equipment: Equipment[] = [];
  private readonly kids = new Set<Kid>();
  private readonly toys = new Set<Toy>();
  private toyBox!: ToyBox;
  private gate!: GardenGate;
  /** Blumen und Sandkuchen */
  garden!: Garden;
  /** Bunker-Eingang, den ein Kind mit Schaufel ausgräbt */
  bunker!: Bunker;
  /** Der Hund (schwarzer Labrador), lebt immer auf der Wiese */
  dog!: Dog;
  /** Nachbarskatzen, die ab und zu über Wiese und Dächer laufen */
  cats!: Cats;
  /** Feen aus dem Zaubertrank, die älteste zuerst. */
  private fairies: Fairy[] = [];
  /** Fotos der Kamera an der Fotoleine */
  photos!: Photos;
  /** Schminke der Kinder (Gesicht, Glitzertattoos), eigener Speicher. */
  makeup!: KidMakeup;
  /** Tageszeiten, Himmel, Einfärbung */
  dayCycle!: DayCycle;
  /** Wetter (Regen, Pfützen, Regenbogen) */
  weather!: Weather;
  /** Kamera über der breiten Wiese (Wischen zum Scrollen, folgt der Rakete nach oben) */
  cameraControl!: CameraControl;
  /** Himmel über der Wiese: Wolkenschicht und Weltall (Rakete, #75) */
  space!: Space;
  /** Tonausgabe (hört auf 'sound'-Ereignisse) */
  audio!: SoundSystem;
  /** Felix' Garten mit Lichterkette und Gartentor (#64) */
  felixGarden!: FelixGarden;
  /** Lichter über der Nacht, die trotzdem von allem davor verdeckt werden */
  lightLayer!: LightLayer;
  private readonly worldStates = new Map<string, WorldState>();
  /** Verkleidung je Kind (Ankleidekiste, #70) – bleibt auch, wenn das Kind heimgeht und wiederkommt. */
  private readonly outfits = new Map<string, Outfit>();
  /** Gerade gezogene Objekte je Finger (für das Scrollen am Bildschirmrand). */
  private readonly drags = new Map<number, { pointer: Phaser.Input.Pointer; ox: number; oy: number; move: DragMove }>();
  /** Der Finger, der gerade das Scrollen am Rand steuert. */
  private edgePointer?: number;
  private savedWorld: Record<string, unknown> = {};
  /** Geschaffte Level der Strom-Werkstatt. */
  private circuitSolved = new Set<number>();
  /** Kamera-Stand im letzten Bild (bewegt sie sich, folgen gezogene Objekte dem Finger neu). */
  private lastScroll = { x: 0, y: 0 };

  constructor() {
    super('Playground');
  }

  create(): void {
    // Zuerst: Hintergrund und Spielzeuge (Taschenlampe) melden sich schon beim Aufbau an.
    this.lightLayer = new LightLayer(this);
    new Backdrop(this);
    this.felixGarden = new FelixGarden(this);
    new TerraceGate(this, TERRACE_GATE.x, TERRACE_GATE.y);

    this.equipment = EQUIPMENT.map((def) => createEquipment(this, def));
    this.gate = new GardenGate(this, GARDEN_GATE.x, GARDEN_GATE.y);
    this.toyBox = new ToyBox(this, TOY_BOX.x, TOY_BOX.y);

    this.registerWorldState('outfits', {
      save: () => Object.fromEntries(this.outfits),
      load: (v) => {
        if (typeof v !== 'object' || v === null) return;
        for (const [id, o] of Object.entries(v as Record<string, unknown>)) {
          const outfit = parseOutfit(o);
          if (Object.keys(outfit).length) this.outfits.set(id, outfit);
        }
        for (const kid of this.kids) kid.setOutfit(this.outfits.get(kid.def.id) ?? {});
      },
    });

    this.registerWorldState('circuit', {
      save: () => [...this.circuitSolved].sort(),
      load: (v) => {
        if (Array.isArray(v)) v.forEach((n) => Number.isInteger(n) && n >= 0 && n < 20 && this.circuitSolved.add(n));
      },
    });

    this.registerWorldState('fairies', {
      save: () => this.fairies.map((f) => ({ id: f.fairyId, ...f.restPosition() })),
      load: (v) => {
        if (!Array.isArray(v)) return;
        for (const f of v.slice(0, MAX_FAIRIES)) {
          const o = f as { id?: unknown; x?: unknown; y?: unknown };
          if (typeof o?.x !== 'number' || typeof o.y !== 'number' || !Number.isFinite(o.x) || !Number.isFinite(o.y)) continue;
          if (!FAIRIES.includes(o.id as FairyId)) continue;
          this.fairies.push(new Fairy(this, o.id as FairyId, o.x, o.y));
        }
      },
    });

    const save = loadSave();
    if (save) this.restore(save);
    else {
      // Allererster Start: die Standard-Wiese.
      PLACED_KIDS.forEach((k) => this.spawnKid(getCharacterDef(k.kid), k.x, k.y));
      PLACED_TOYS.forEach((t) => this.spawnToy(getToyDef(t.toy), t.x, t.y));
    }

    this.garden = new Garden(this);
    this.bunker = new Bunker(this);
    this.photos = new Photos(this);
    this.makeup = new KidMakeup(this, (id) => {
      for (const kid of this.kids) if (kid.def.id === id) kid.refreshMakeup();
    });
    this.dayCycle = new DayCycle(this);
    this.weather = new Weather(this, this.dayCycle);
    this.cameraControl = new CameraControl(this);
    this.space = new Space(this);
    this.dog = new Dog(this, DOG.start.x, DOG.start.y);
    this.cats = new Cats(this);
    this.audio = new SoundSystem(this);

    this.setupInput();
    new AutoSave(this, () => this.snapshot());
  }

  update(_time: number, delta: number): void {
    this.equipment.forEach((e) => e.update());
    this.updateEdgeScroll(delta);
    // Folgt die Kamera z. B. der Rakete, steht der Finger an einer neuen Weltstelle
    const cam = this.cameras.main;
    if (cam.scrollX !== this.lastScroll.x || cam.scrollY !== this.lastScroll.y) {
      this.lastScroll = { x: cam.scrollX, y: cam.scrollY };
      for (const d of this.drags.values()) this.followDrag(d.pointer);
    }
  }

  // --- Gezogene Objekte folgen dem Finger (auch beim Scrollen) ---------------

  /** Beginnt, ein Objekt mit einem Finger zu ziehen (Versatz zum Finger bleibt erhalten). */
  beginDrag(pointer: Phaser.Input.Pointer, obj: { x: number; y: number }, move: DragMove): void {
    const w = this.worldPoint(pointer);
    this.drags.set(pointer.id, { pointer, ox: obj.x - w.x, oy: obj.y - w.y, move });
  }

  /** Setzt das gezogene Objekt unter den Finger (in Weltkoordinaten). */
  followDrag(pointer: Phaser.Input.Pointer): void {
    const d = this.drags.get(pointer.id);
    if (!d) return;
    const w = this.worldPoint(pointer);
    d.move(pointer, w.x + d.ox, w.y + d.oy);
  }

  endDrag(pointer: Phaser.Input.Pointer): void {
    this.drags.delete(pointer.id);
    if (this.edgePointer === pointer.id) this.edgePointer = undefined;
  }

  /**
   * Hält ein Finger ein Objekt nahe am linken/rechten Rand, scrollt die Welt – je näher,
   * desto schneller. Bei mehreren Fingern steuert der, der zuerst am Rand war. Alle gezogenen
   * Objekte werden danach neu unter ihren Finger gesetzt (Phaser meldet ohne Fingerbewegung nichts).
   */
  private updateEdgeScroll(delta: number): void {
    if (this.drags.size === 0) return;
    const edgeSpeed = (d: { pointer: Phaser.Input.Pointer }) => {
      const x = d.pointer.x;
      if (x < EDGE_SCROLL_ZONE) return -EDGE_SCROLL_SPEED * (1 - Math.max(0, x) / EDGE_SCROLL_ZONE);
      if (x > GAME_WIDTH - EDGE_SCROLL_ZONE) return EDGE_SCROLL_SPEED * (1 - Math.max(0, GAME_WIDTH - x) / EDGE_SCROLL_ZONE);
      return 0;
    };
    let steering = this.edgePointer !== undefined ? this.drags.get(this.edgePointer) : undefined;
    if (!steering || edgeSpeed(steering) === 0) {
      this.edgePointer = undefined;
      for (const [id, d] of this.drags) {
        if (edgeSpeed(d) !== 0) {
          this.edgePointer = id;
          steering = d;
          break;
        }
      }
    }
    if (this.edgePointer === undefined || !steering) return;
    const before = this.cameraControl.scrollX;
    this.cameraControl.scrollBy(edgeSpeed(steering) * (delta / 1000));
    if (this.cameraControl.scrollX === before) return; // Weltende
    for (const d of this.drags.values()) this.followDrag(d.pointer);
  }

  // --- Speichern ----------------------------------------------------------

  /** Meldet einen Weltzustand zum Mitspeichern an; ein gespeicherter Wert wird sofort geladen. */
  registerWorldState(key: string, state: WorldState): void {
    this.worldStates.set(key, state);
    if (key in this.savedWorld) state.load(this.savedWorld[key]);
  }

  private snapshot(): SaveData {
    const pos = (p: { x: number; y: number }) => ({ x: Math.round(p.x), y: Math.round(p.y) });
    const world: Record<string, unknown> = {};
    for (const [key, state] of this.worldStates) world[key] = state.save();
    return {
      version: SAVE_VERSION,
      kids: [...this.kids].map((k) => ({ id: k.def.id, ...pos(k.restPosition()) })),
      toys: [...this.toys].map((t) => ({ id: t.def.id, ...pos(t.restPosition()), ...(t.heldBy ? { heldBy: t.heldBy.def.id } : {}) })),
      world,
    };
  }

  private restore(save: SaveData): void {
    const x = (v: number) => Phaser.Math.Clamp(v, 60, WORLD_WIDTH - 60);
    const y = (v: number) => Phaser.Math.Clamp(v, GROUND_MIN_Y, GROUND_MAX_Y);
    for (const k of save.kids) {
      const def = CHARACTERS.find((c) => c.id === k.id);
      if (def) this.spawnKid(def, x(k.x), y(k.y));
    }
    for (const t of save.toys) {
      const def = TOYS.find((d) => d.id === t.id);
      const toy = def && this.spawnToy(def, x(t.x), y(t.y));
      // Wer etwas in der Hand hatte, hält es wieder
      const holder = t.heldBy && [...this.kids].find((k) => k.def.id === t.heldBy);
      if (toy && holder) toy.offerKid(holder);
    }
    this.savedWorld = save.world;
    for (const [key, state] of this.worldStates) if (key in this.savedWorld) state.load(this.savedWorld[key]);
  }

  // --- Spielzeuge auf der Wiese -------------------------------------------

  /** Legt ein neues Spielzeug auf die Wiese. null, wenn die Obergrenze erreicht ist. */
  spawnToy(def: ToyDef, x: number, y: number): Toy | null {
    if (this.isFull()) return null;
    const toy = new Toy(this, def, x, y);
    this.toys.add(toy);
    return toy;
  }

  /** Spielzeug zählt nicht mehr zur Wiese (z. B. weil es gerade weggeräumt wird). */
  forgetToy(toy: Toy): void {
    if (this.toys.delete(toy)) toy.notifyRemoved();
  }

  /** Liegt (x, y) in einem Sandkasten? */
  isInSandbox(x: number, y: number): boolean {
    return this.equipment.some((e) => e instanceof Sandbox && e.contains(x, y));
  }

  /** Alle Spielzeuge, die gerade auf der Wiese sind. */
  toysOnMeadow(): Toy[] {
    return [...this.toys];
  }

  /** Spielzeug verschwindet ohne Animation (z. B. geplatzter Ballon). */
  removeToy(toy: Toy): void {
    this.forgetToy(toy);
    toy.destroy();
  }

  /** Ein gezogenes Spielzeug wurde losgelassen: wegräumen oder auf die Wiese. */
  /** Zeiger in Weltkoordinaten (die Wiese ist breiter als der Bildschirm und scrollt). */
  worldPoint(pointer: Phaser.Input.Pointer): Phaser.Math.Vector2 {
    return this.cameras.main.getWorldPoint(pointer.x, pointer.y);
  }

  releaseToy(toy: Toy, pointer: Phaser.Input.Pointer): void {
    // Die Kiste steht fest auf dem Bildschirm: Bildschirm-Koordinaten.
    if (this.toyBox.accepts(pointer.x, pointer.y)) {
      this.toyBox.putAway(toy);
      return;
    }
    // Auf ein anderes Spielzeug fallen gelassen, das es aufnimmt (z. B. Schubkarre)?
    for (const other of this.toys) {
      const zone = other !== toy ? this.dropZone(other) : undefined;
      // Großzügig: Finger oder Mitte des Spielzeugs über dem anderen Spielzeug
      const w = this.worldPoint(pointer);
      const over = zone && (zone.contains(w.x, w.y) || zone.contains(toy.x, toy.y - toy.displayHeight / 2));
      if (over && other.offerToy(toy)) {
        // Das Spielzeug kann dabei verschwunden sein (z. B. Schneebälle verschmelzen).
        if (toy.active) {
          toy.handleDragEnd(pointer);
          toy.physics.stop();
        }
        return;
      }
    }
    toy.handleDragEnd(pointer);
  }

  /** Großzügige Fläche, auf der man etwas auf einem Spielzeug fallen lassen kann. */
  private dropZone(toy: Toy): Phaser.Geom.Rectangle {
    const b = toy.getBounds();
    return new Phaser.Geom.Rectangle(b.x - 40, b.y - 60, b.width + 80, b.height + 100);
  }

  // --- Kinder auf der Wiese -----------------------------------------------

  /** Holt ein Kind auf die Wiese. null, wenn es schon da ist oder die Obergrenze erreicht ist. */
  spawnKid(def: CharacterDef, x: number, y: number): Kid | null {
    if (this.isFull() || this.hasKid(def.id as CharacterId)) return null;
    const kid = new Kid(this, def, x, y);
    kid.setOutfit(this.outfits.get(def.id) ?? {});
    this.kids.add(kid);
    this.gate?.refresh();
    return kid;
  }

  /** Alle Kinder, die gerade auf der Wiese sind. */
  kidsOnMeadow(): Kid[] {
    return [...this.kids];
  }

  hasKid(id: CharacterId): boolean {
    for (const kid of this.kids) if (kid.def.id === id) return true;
    return false;
  }

  /** Kind zählt nicht mehr zur Wiese (geht gerade nach Hause). */
  forgetKid(kid: Kid): void {
    this.kids.delete(kid);
    this.gate.refresh();
  }

  /** Ein gezogenes Kind wurde losgelassen: nach Hause, auf ein Spielgerät oder auf die Wiese. */
  releaseKid(kid: Kid, pointer: Phaser.Input.Pointer, arriving = false): void {
    kid.endDrag();
    if (this.gate.accepts(pointer)) {
      this.gate.sendHome(kid);
      return;
    }
    // Auf ein Spielzeug gezogen, das Kinder annimmt (z. B. Drachen, Ballon festhalten)?
    for (const toy of this.toys) {
      const zone = this.dropZone(toy);
      const w = this.worldPoint(pointer);
      const holder = toy.def.tags?.includes('makeup') ? toy.heldBy : undefined;
      const overHolder = holder !== undefined && holder !== kid && holder.getBounds().contains(w.x, w.y);
      if ((zone.contains(w.x, w.y) || zone.contains(kid.x, kid.y) || overHolder) && toy.offerKid(kid)) {
        // Hält das Kind nur etwas fest (Ballon), steht es auf der Wiese; sitzt es auf einem Fahrzeug, nicht.
        if (kid.mode === 'idle') kid.settle();
        return;
      }
    }
    const spot = this.equipment.find((e) => e.accepts(kid, kid.x, kid.y));
    if (spot) {
      spot.use(kid);
      return;
    }
    kid.settle(() => {
      // Neu angekommene Kinder freuen sich mit einem Hüpfer; in einer Pfütze spritzt es.
      this.weather.onKidLanded(kid);
      if (arriving) kid.hop();
      // Mit Schaufel weit links im Gras: buddelt nach dem Bunker
      else this.bunker.onKidLanded(kid);
    });
  }

  // --- Ankleidekiste (#70) ------------------------------------------------------

  /** Neue Verkleidung für ein Kind (wird gespeichert). */
  setKidOutfit(kid: Kid, outfit: Outfit): void {
    if (Object.keys(outfit).length) this.outfits.set(kid.def.id, { ...outfit });
    else this.outfits.delete(kid.def.id);
    kid.setOutfit(outfit);
  }

  /**
   * Wechselt ins Ankleide-Spiel (DressUpScene). Die Wiese schläft solange; jede Änderung wird
   * sofort übernommen. Zurück auf der Wiese ruft sie `back` (das Kind kommt aus der Kiste).
   */
  openDressUp(kid: Kid, back: () => void): void {
    this.closeInventories();
    const cam = this.cameras.main;
    cam.fadeOut(300, 0, 0, 0);
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      const data: DressUpData = {
        def: kid.def,
        outfit: kid.outfit,
        onChange: (outfit) => this.setKidOutfit(kid, outfit),
        onDone: () => {
          this.scene.stop('DressUp');
          this.scene.wake();
          cam.fadeIn(300, 0, 0, 0);
          back();
        },
      };
      this.scene.launch('DressUp', data);
      this.scene.sleep();
    });
  }

  /**
   * Grill-Spiel hinter Felix' grünem Tor (#66): Die Kinder von der Wiese stellen sich am Grill an
   * (mindestens zwei, sonst kommen welche dazu). Die Wiese schläft solange.
   */
  openGrill(): void {
    this.closeInventories();
    const onMeadow = [...this.kids].filter((k) => k.visible && k.mode !== 'leaving');
    const kids = onMeadow.map((k) => ({ def: k.def, outfit: k.outfit }));
    for (const def of CHARACTERS) {
      if (kids.length >= 2) break;
      if (!kids.some((k) => k.def.id === def.id)) kids.push({ def, outfit: this.outfits.get(def.id) ?? {} });
    }
    const cam = this.cameras.main;
    cam.fadeOut(300, 0, 0, 0);
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      const data: GrillData = {
        kids,
        onDone: () => {
          this.scene.stop('Grill');
          this.scene.wake();
          cam.fadeIn(300, 0, 0, 0);
        },
      };
      this.scene.launch('Grill', data);
      this.scene.sleep();
    });
  }

  /** Kreide-Malspiel auf der Steinterrasse hinter dem grauen Tor. Die Wiese schläft solange. */
  openChalk(): void {
    this.closeInventories();
    const cam = this.cameras.main;
    cam.fadeOut(300, 0, 0, 0);
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      const data: ChalkData = {
        onDone: () => {
          this.scene.stop('Chalk');
          this.scene.wake();
          cam.fadeIn(300, 0, 0, 0);
        },
      };
      this.scene.launch('Chalk', data);
      this.scene.sleep();
    });
  }

  /** Strom-Werkstatt (Elektro-Baukasten). Die Wiese schläft solange; geschaffte Level werden gespeichert. */
  openCircuit(): void {
    this.closeInventories();
    const cam = this.cameras.main;
    cam.fadeOut(300, 0, 0, 0);
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      const data: CircuitData = {
        solved: [...this.circuitSolved],
        onSolved: (level) => this.circuitSolved.add(level),
        onDone: () => {
          this.scene.stop('Circuit');
          this.scene.wake();
          cam.fadeIn(300, 0, 0, 0);
        },
      };
      this.scene.launch('Circuit', data);
      this.scene.sleep();
    });
  }

  /** Tischtennis: Platte antippen öffnet Pong. Es spielen die zwei Kinder, die der Platte am nächsten sind. */
  openPong(table: Toy): void {
    this.closeInventories();
    const near = [...this.kids]
      .filter((k) => k.visible && k.mode !== 'leaving')
      .sort((a, b) => Phaser.Math.Distance.Between(a.x, a.y, table.x, table.y) - Phaser.Math.Distance.Between(b.x, b.y, table.x, table.y));
    const kids = near.slice(0, 2).map((k) => ({ def: k.def, outfit: k.outfit }));
    for (const def of CHARACTERS) {
      if (kids.length >= 2) break;
      if (!kids.some((k) => k.def.id === def.id)) kids.push({ def, outfit: this.outfits.get(def.id) ?? {} });
    }
    // Wer links steht, spielt links
    const [a, b] = near;
    if (a && b && a.x > b.x) kids.reverse();
    const cam = this.cameras.main;
    cam.fadeOut(300, 0, 0, 0);
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      const data: PongData = {
        kids,
        onDone: () => {
          this.scene.stop('Pong');
          this.scene.wake();
          cam.fadeIn(300, 0, 0, 0);
        },
      };
      this.scene.launch('Pong', data);
      this.scene.sleep();
    });
  }

  /** Zaubertrank: Eimer antippen öffnet das Brau-Spiel. Zurück erscheint die neue Fee neben dem Eimer. */
  openBrew(bucket: Toy): void {
    this.closeInventories();
    const cam = this.cameras.main;
    cam.fadeOut(300, 0, 0, 0);
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      const data: BrewData = {
        onDone: (fairy) => {
          this.scene.stop('Brew');
          this.scene.wake();
          cam.fadeIn(300, 0, 0, 0);
          if (fairy) this.addFairy(fairy, bucket.x, bucket.y);
        },
      };
      this.scene.launch('Brew', data);
      this.scene.sleep();
    });
  }

  /** Neue Fee auf der Wiese; sind es zu viele, geht die älteste mit Glitzer fort. */
  addFairy(id: FairyId, nearX: number, nearY: number): void {
    const spot = fairySpot(nearX, nearY);
    this.fairies.push(new Fairy(this, id, spot.x, spot.y));
    while (this.fairies.length > MAX_FAIRIES) this.fairies.shift()?.vanish();
  }

  /** Snackbox-Spiel: das Kind mit der Box und ein zweites (von der Wiese oder aus den Figuren) halten die Zahlen hoch. */
  openSnack(holder: Kid): void {
    this.closeInventories();
    const others = [...this.kids].filter((k) => k !== holder && k.visible && k.mode !== 'leaving');
    const kids = [holder, ...others].slice(0, 2).map((k) => ({ def: k.def, outfit: k.outfit }));
    for (const def of CHARACTERS) {
      if (kids.length >= 2) break;
      if (!kids.some((k) => k.def.id === def.id)) kids.push({ def, outfit: this.outfits.get(def.id) ?? {} });
    }
    const cam = this.cameras.main;
    cam.fadeOut(300, 0, 0, 0);
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      const data: SnackData = {
        kids,
        onDone: () => {
          this.scene.stop('Snack');
          this.scene.wake();
          cam.fadeIn(300, 0, 0, 0);
        },
      };
      this.scene.launch('Snack', data);
      this.scene.sleep();
    });
  }

  /** Kinderschminken: Das Kind, das auf den Koffer gezogen wurde, wird geschminkt. Die Wiese schläft solange. */
  openMakeup(guest: Kid): void {
    this.closeInventories();
    const cam = this.cameras.main;
    // Was das Kind schon trägt, wird weitergeschminkt (Bilder laden, während ausgeblendet wird)
    const saved = this.makeup.get(guest.def.id);
    cam.fadeOut(300, 0, 0, 0);
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, async () => {
      const data: MakeupData = {
        def: guest.def,
        saved: await saved,
        onDone: (result) => {
          this.makeup.set(guest.def.id, result);
          this.scene.stop('Makeup');
          this.scene.wake();
          cam.fadeIn(300, 0, 0, 0);
        },
      };
      this.scene.launch('Makeup', data);
      this.scene.sleep();
    });
  }

  /**
   * Sternenflug: Die Rakete ist oben aus dem Weltall hinausgeflogen (Warp). Alle Finger lassen los
   * (Ziehen endet sauber, sonst hinge die Rakete nach dem Aufwachen an einem Finger, der längst weg ist),
   * die Kinder in der Rakete fliegen mit. Zurück steht die Rakete oben im Weltall und sinkt.
   */
  openAsteroids(riders: Kid[]): void {
    this.closeInventories();
    this.releaseAllDrags();
    const kids = riders.map((k) => ({ def: k.def, outfit: k.outfit }));
    const cam = this.cameras.main;
    cam.fadeOut(400, 255, 255, 255);
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      const data: AsteroidData = {
        kids,
        onDone: () => {
          this.scene.stop('Asteroids');
          this.scene.wake();
          cam.fadeIn(300, 0, 0, 0);
        },
      };
      this.scene.launch('Asteroids', data);
      this.scene.sleep();
    });
  }

  /** Beendet jedes laufende Ziehen, als hätten alle Finger losgelassen. */
  private releaseAllDrags(): void {
    // processDragUpEvent ist in Phasers Typen nicht veröffentlicht, sendet aber genau die dragend-Ereignisse
    const input = this.input as unknown as { processDragUpEvent(p: Phaser.Input.Pointer): void };
    for (const d of [...this.drags.values()]) input.processDragUpEvent(d.pointer);
    this.drags.clear();
    this.edgePointer = undefined;
  }

  private isFull(): boolean {
    return this.toys.size + this.kids.size >= MAX_OBJECTS;
  }

  /** Schließt offene Leisten (Spielzeugkiste, Gartentor). */
  closeInventories(): void {
    this.toyBox?.close();
    this.gate?.close();
  }

  // --- Eingabe -------------------------------------------------------------

  private setupInput(): void {
    this.input.dragDistanceThreshold = DRAG_THRESHOLD;

    // Bewegliches hat Vorrang: Liegt ganz oben feststehende Deko (Baum) oder ein großes
    // Spielgerät (Korb, Tor, Pool, …), bekommt ein Kind oder kleines Spielzeug dahinter den Finger.
    // Phaser gibt Tippen und Ziehen nur an das erste Objekt dieser Liste (topOnly).
    const sort = this.input.sortGameObjects.bind(this.input);
    this.input.sortGameObjects = (objects, pointer) => {
      const list = sort(objects, pointer);
      const top = list.length > 1 ? touchRank(list[0]) : -1;
      if (top <= 0) return list; // Bewegliches oder Leiste/Kiste/Tor liegt schon oben
      let best = 0;
      for (let i = 1; i < list.length; i++) {
        const r = touchRank(list[i]);
        if (r >= 0 && r < touchRank(list[best])) best = i;
      }
      if (best > 0) list.unshift(...list.splice(best, 1));
      return list;
    };

    this.input.on('dragstart', (p: Phaser.Input.Pointer, obj: Phaser.GameObjects.GameObject) => {
      if (!(obj instanceof Toy) && !(obj instanceof Kid) && !(obj instanceof Dog)) return;
      obj.handleDragStart();
      this.beginDrag(p, obj, (pp, x, y) => obj.handleDrag(pp, x, y));
    });

    // Position selbst aus Finger + Versatz berechnen (gleich wie beim Scrollen am Rand).
    this.input.on('drag', (p: Phaser.Input.Pointer) => this.followDrag(p));

    this.input.on('dragend', (p: Phaser.Input.Pointer, obj: Phaser.GameObjects.GameObject) => {
      this.endDrag(p);
      if (obj instanceof Toy) {
        this.releaseToy(obj, p);
        return;
      }
      if (obj instanceof Kid) this.releaseKid(obj, p);
      if (obj instanceof Dog) obj.release();
    });

    // Tippen auf eine freie Stelle schließt offene Leisten.
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (over.length === 0 && pointer.getDistance() < DRAG_THRESHOLD) {
        this.closeInventories();
        const w = this.worldPoint(pointer);
        this.weather.onFreeTap(w.x, w.y);
      }
    });

    // Tippen = Finger runter und wieder hoch, ohne nennenswert zu ziehen.
    this.input.on('gameobjectup', (pointer: Phaser.Input.Pointer, obj: Phaser.GameObjects.GameObject) => {
      if (pointer.getDistance() >= DRAG_THRESHOLD) return;
      const onTap: unknown = obj.getData('onTap');
      if (typeof onTap === 'function') onTap(pointer);
    });
  }
}

/**
 * Vorrang beim Antippen: 0 = Kind oder kleines Spielzeug, 1 = großes Spielgerät oder Katze,
 * 2 = feststehende Deko (`setData('scenery', true)`), −1 = alles andere (Leisten, Kiste, Tor, Wolken).
 * Ein Kind auf einem Fahrzeug zählt wie das Fahrzeug: Wo sich beide überdecken, gewinnt das
 * obere – so lässt sich auch ein kleines Fahrzeug unter dem Kind noch fahren.
 */
function touchRank(obj: Phaser.GameObjects.GameObject): number {
  if (obj instanceof Kid) return obj.mode === 'riding' ? 1 : 0;
  if (obj instanceof Dog) return 0;
  // Katzen: Kinder und Spielzeug davor behalten den Finger, Deko dahinter nicht
  if (obj instanceof Cat) return 1;
  if (obj instanceof Toy) return obj.def.large ? 1 : 0;
  if (obj.getData('scenery') === true) return 2;
  return -1;
}
