import Phaser from 'phaser';
import { FAIRIES, INGREDIENTS } from '../data/brew';
import {
  BASKET_SIZE,
  FAIRY_SIZE,
  INGREDIENT_SIZE,
  POT_SIZE,
  SPARK_SIZE,
  SPOON_SIZE,
  drawBasket,
  drawBrewBg,
  drawFairy,
  drawIngredient,
  drawPot,
  drawPotRim,
  drawSpark,
  drawSpoon,
} from './placeholders/brew';
import { BALL_SIZE, drawBallShadow, drawModeButton, drawPongBall, drawPongBg, drawPongTable, drawRacket, RACKET_SIZE, TABLE_PAD } from './placeholders/pong';
import { LAYOUT as PONG_LAYOUT, TABLE as PONG_TABLE } from '../data/pong';
import { GAME_HEIGHT, GAME_WIDTH, GROUND_TOP } from '../config';
import { PERGOLAS, type BackTreeKind, type BushKind, type HouseKind } from '../data/backdrop';
import { CHARACTERS } from '../data/characters';
import { FOOD_IDS, STAGES } from '../data/grill';
import { BOTTLE_SIZE, CLOTH_SIZE, drawBottle, drawCloth, drawFood, drawGrillBackground, drawGrillFront, drawPlate, foodSize, GRILL } from './placeholders/grill';
import { COSTUMES, costumeKey, SLOTS } from '../data/costumes';
import { COSTUME_ART, layerLayout } from './placeholders/costumes';
import { BOX, boxDoorOutline, drawDressBox, drawDressBoxInside, drawDressRoom, drawHanger, drawItemGlow } from './placeholders/dressup';
import { TOYS } from '../data/toys';
import { drawKidFace, drawKidPart, drawPortrait, partSize, PORTRAIT_SIZE } from './placeholders/kids';
import { BACK_TREE_SIZE, BIG_TREE, BUSH_SIZE, drawBackTree, drawBigTree, drawBush, drawFence, drawFenceSnow, drawMeadow, drawPergola, drawPergolaSnow, drawSmoke, drawWindowGlow, FENCE_TILE_HEIGHT, FENCE_TILE_TOP, HOUSE_SPECS, houseKey, MEADOW_TILE_HEIGHT, pergolaArea, TILE_COUNT, WINDOW_GLOW_SIZE } from './placeholders/backdrop';
import {
  drawFairyLights,
  drawGate,
  drawGrill,
  drawPergola as drawGardenPergola,
  drawPergolaSnow as drawGardenPergolaSnow,
  drawRailing,
  drawShed,
  drawShedSnow,
  drawSoftGlow,
  drawTrunk,
  drawVineCurtain,
  GATE_SIZE,
  GRILL_SIZE,
  LIGHTS_AREA,
  PERGOLA_AREA,
  RAILING_SIZE,
  SHED_AREA,
  TRUNK_SIZE,
  VINE_CURTAIN_SIZE,
} from './placeholders/garden';
import {
  archOutline,
  drawPlayhouseBack,
  drawPlayhouseFront,
  drawPlayhouseSlide,
  HOUSE_AREA,
  PH,
  rungSlots,
  SLIDE_AREA,
} from './placeholders/playhouse';
import {
  BOX_SIZE,
  CARD_SIZE,
  drawCard,
  drawSnack,
  drawSnackBg,
  drawSnackBoxOpen,
  drawSnackPlate,
  drawSnackSign,
  PLATE_SIZE,
  SNACK_SIZE,
} from './placeholders/snack';
import { SNACK, SNACKS } from '../data/snacks';
import { drawWhirlpool, TOY_PLACEHOLDERS } from './placeholders/toys';
import { CATS } from '../data/cats';
import {
  CAT_BODY_SIZE,
  CAT_FACES,
  CAT_HEAD_SIZE,
  CAT_LEG_SIZE,
  CAT_SHORT_TAIL_SIZE,
  CAT_TAIL_SIZE,
  catKey,
  drawCatBody,
  drawCatHead,
  drawCatLeg,
  drawCatTail,
} from './placeholders/cats';
import { DOG_BODY_SIZE, DOG_HEAD_SIZE, DOG_LEG_SIZE, DOG_TAIL_SIZE, drawDogBody, drawDogHead, drawDogLeg, drawDogTail } from './placeholders/dog';
import {
  BUNKER_FRAME_SIZE,
  BUNKER_LID_SIZE,
  BUNKER_WHEEL_SIZE,
  DIG_HOLE_SIZE,
  DIRT_PILE_SIZE,
  drawBunkerFrame,
  drawBunkerLid,
  drawBunkerWheel,
  drawDigHole,
  drawDirtPile,
} from './placeholders/bunker';
import { CHALK_COLORS } from '../data/chalk';
import {
  BUCKET_SIZE,
  CHALK_DOT_SIZE,
  CHALK_LAYOUT,
  CHALK_STICK_SIZE,
  drawBucket,
  drawChalkDot,
  drawChalkGround,
  drawChalkStick,
  drawChalkTray,
  drawEraser,
  drawExitSign,
  drawSponge,
  drawTerraceGate,
  ERASER_SIZE,
  SPONGE_SIZE,
  TERRACE_GATE_SIZE,
} from './placeholders/chalk';
import { drawPhotoLine, drawPhotoPeg, PHOTO_LINE_SIZE, PHOTO_PEG_SIZE } from './placeholders/photos';
import {
  BANDAID_SIZE,
  BATTERY_SIZE,
  drawBandaid,
  drawBattery,
  drawBoard,
  drawCircuitSign,
  drawGate as drawLogicGate,
  drawGlow,
  drawLamp,
  drawSlot,
  drawSwitch,
  drawTray as drawCircuitTray,
  GATE_SIZE as LOGIC_GATE_SIZE,
  GLOW_SIZE,
  LAMP_SIZE,
  SWITCH_SIZE,
  TRAY_SIZE,
} from './placeholders/circuit';
import { CIRCUIT } from '../data/circuit';
import { ROCK_SHAPES, type RockSize } from '../data/asteroids';
import { CURL_SIZE, drawCurl, drawGlueBrush, drawGluePot, drawPaper, drawSheet, drawShape, drawModeSwitch, GLUE_BRUSH_SIZE, GLUE_POT_SIZE, MODE_SWITCH_SIZE, CUP_SIZE, drawBrushDot, drawGrain, drawJar, drawJarFill, drawJarRainbow, drawMakeupBg, drawMirror, drawPan, drawPanFill, drawPenCup, drawPen, drawPuffHandle, drawPuffHead, drawMakeupSponge, JAR_SIZE, PAN_SIZE, PUFF_HANDLE, PUFF_HEAD, MAKEUP_SPONGE_SIZE } from './placeholders/makeup';
import { MIRROR, PEN_SIZE, SHAPES, SHEET, STENCIL } from '../data/makeup';
import { drawEarth, drawGoldStar, drawRock, drawShot, EARTH_SIZE, GOLD_STAR_SIZE, rockTextureSize, SHOT_SIZE } from './placeholders/asteroids';
import {
  ALIEN_ARM_SIZE,
  ALIEN_SIZE,
  drawAlien,
  drawAlienArm,
  drawFlame,
  drawPlanet,
  drawRocket,
  drawRocketGlass,
  drawShootingStar,
  drawUfo,
  FLAME_SIZE,
  PLANET_SIZE,
  ROCKET_ART,
  SHOOTING_STAR_SIZE,
  UFO_SIZE,
} from './placeholders/space';

// Erzeugt Platzhalter-Grafiken per Code, damit das Spiel ohne Asset-Dateien läuft.
// Sobald echte Grafiken da sind: PNGs nach public/assets/ legen, hier in preload()
// mit this.load.image(key, 'assets/…png') laden und die passende make…-Funktion löschen.
// Die Texture-Keys bleiben gleich, der Rest des Codes merkt davon nichts.

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    // Hier später: this.load.image('kid-kind-a-head', 'assets/kinder/kind-a/head.png'); usw.
    // (Format der Einzelteile: README, Abschnitt „Echte Figuren“)
  }

  create(): void {
    CHARACTERS.forEach((c) => {
      // Gesichter (Blinzeln, Lachen, Gähnen) passen nur zum Platzhalter-Kopf. Für einen echten Kopf
      // müssen sie mitgeliefert werden – sonst bleibt das Gesicht einfach unverändert.
      const placeholderHead = !this.textures.exists(`kid-${c.id}-head`);
      for (const part of ['head', 'body', 'arm', 'leg'] as const) {
        const { width, height } = partSize(c, part);
        this.makeTexture(`kid-${c.id}-${part}`, width, height, (g) => drawKidPart(g, c, part));
      }
      if (placeholderHead) {
        const { width, height } = partSize(c, 'head');
        for (const face of ['blink', 'joy', 'yawn', 'yuck'] as const) {
          this.makeTexture(`kid-${c.id}-face-${face}`, width, height, (g) => drawKidFace(g, c, face));
        }
      }
      this.makeTexture(`portrait-${c.id}`, PORTRAIT_SIZE, PORTRAIT_SIZE, (g) => drawPortrait(g, c));
    });

    this.makeTexture('gate', 200, 150, (g) => {
      // Pfosten
      g.fillStyle(0x8d6e63);
      g.fillRoundedRect(0, 0, 22, 150, 6);
      g.fillRoundedRect(178, 0, 22, 150, 6);
      // Durchgang (dahinter sieht man den Weg)
      g.fillStyle(0xd7ccc8);
      g.fillRect(22, 20, 156, 130);
      g.fillStyle(0xbcaaa4);
      g.fillRect(60, 60, 80, 90);
    });

    this.makeTexture('gate-door', 156, 124, (g) => {
      g.fillStyle(0xe9c46a);
      for (let x = 0; x < 156; x += 26) g.fillRoundedRect(x + 2, 0, 22, 124, { tl: 11, tr: 11, bl: 0, br: 0 });
      g.fillStyle(0xd4a373);
      g.fillRect(0, 30, 156, 14);
      g.fillRect(0, 88, 156, 14);
      // Herz
      g.fillStyle(0xef476f);
      g.fillCircle(70, 62, 10);
      g.fillCircle(86, 62, 10);
      g.fillTriangle(61, 66, 95, 66, 78, 84);
    });

    this.makePlayhouse();

    this.makeTexture('swing-frame', 360, 420, (g) => {
      g.lineStyle(16, 0x6d4c41);
      g.lineBetween(20, 420, 60, 22);
      g.lineBetween(100, 420, 60, 22);
      g.lineBetween(260, 420, 300, 22);
      g.lineBetween(340, 420, 300, 22);
      g.lineStyle(20, 0x5d4037);
      g.lineBetween(40, 20, 320, 20);
    });

    this.makeTexture('sandbox', 360, 120, (g) => {
      g.fillStyle(0x8d6e63);
      g.fillRoundedRect(0, 20, 360, 100, 14);
      g.fillStyle(0xf6d186);
      g.fillRoundedRect(16, 34, 328, 72, 10);
      g.fillStyle(0xe9c46a);
      g.fillCircle(120, 70, 22);
      g.fillCircle(240, 60, 16);
    });

    this.makeTexture('tree', BIG_TREE.width, BIG_TREE.height, drawBigTree);
    this.makeBackdrop();

    this.makeTexture('toybox', 210, 140, (g) => {
      g.fillStyle(0xc0392b);
      g.fillRoundedRect(0, 0, 210, 140, 16);
      g.fillStyle(0xe74c3c);
      g.fillRoundedRect(10, 10, 190, 120, 12);
      g.fillStyle(0xffd166);
      g.fillRect(0, 60, 210, 20);
      // Stern vorne drauf
      g.fillStyle(0xffffff);
      g.fillPoints(starPoints(105, 70, 34, 15), true);
    });

    this.makeTexture('toybox-lid', 220, 36, (g) => {
      g.fillStyle(0xa93226);
      g.fillRoundedRect(0, 0, 220, 36, 12);
      g.fillStyle(0xffd166);
      g.fillRoundedRect(95, 22, 30, 14, 4);
    });

    this.makeTexture('bubble', 60, 60, (g) => {
      g.fillStyle(0xffffff, 0.18);
      g.fillCircle(30, 30, 28);
      g.lineStyle(3, 0xffffff, 0.85);
      g.strokeCircle(30, 30, 27);
      g.fillStyle(0xffffff, 0.9);
      g.fillEllipse(20, 18, 12, 8);
    });

    this.makeTexture('star', 28, 28, (g) => {
      g.fillStyle(0xffd166);
      g.fillPoints(starPoints(14, 14, 13, 6), true);
    });

    this.makeTexture('can', 40, 56, (g) => {
      g.fillStyle(0xadb5bd);
      g.fillRoundedRect(0, 0, 40, 56, 6);
      g.fillStyle(0xe63946);
      g.fillRect(0, 12, 40, 32);
      g.fillStyle(0xffffff);
      g.fillCircle(20, 28, 8);
    });

    this.makeTexture('pin', 30, 72, (g) => {
      g.fillStyle(0xffffff);
      g.fillEllipse(15, 50, 28, 42);
      g.fillCircle(15, 14, 11);
      g.fillRect(10, 18, 10, 18);
      g.fillStyle(0xe63946);
      g.fillRect(9, 24, 12, 4);
      g.fillRect(9, 31, 12, 4);
    });

    this.makeTexture('hoop-net', 96, 60, (g) => {
      g.lineStyle(3, 0xffffff, 0.95);
      for (let i = 0; i <= 6; i++) {
        g.lineBetween(4 + i * 14.6, 0, 20 + i * 9.3, 60);
      }
      for (let y = 15; y <= 60; y += 15) {
        const inset = (y / 60) * 16;
        g.lineBetween(4 + inset, y, 92 - inset, y);
      }
    });

    this.makeTexture('wheel', 44, 44, (g) => {
      g.fillStyle(0x2b2d42);
      g.fillCircle(22, 22, 22);
      g.fillStyle(0xadb5bd);
      g.fillCircle(22, 22, 10);
      g.lineStyle(4, 0xadb5bd);
      g.lineBetween(22, 4, 22, 40);
      g.lineBetween(4, 22, 40, 22);
    });

    this.makeTexture('wheel-yellow', 44, 44, (g) => {
      g.fillStyle(0xffc300);
      g.fillCircle(22, 22, 22);
      g.fillStyle(0xffe066);
      g.fillCircle(22, 22, 11);
      g.fillStyle(0xd49a00);
      g.fillCircle(22, 22, 4);
    });

    this.makeTexture('seesaw-beam', 330, 22, (g) => {
      g.fillStyle(0xe76f51);
      g.fillRoundedRect(0, 0, 330, 22, 10);
      g.fillStyle(0x2b2d42);
      g.fillRoundedRect(22, -2, 12, 10, 4);
      g.fillRoundedRect(296, -2, 12, 10, 4);
    });

    // Vorderer Rand des Planschbeckens mit halbdurchsichtigem Wasser: liegt über Kindern
    // und Spielzeug im Becken, damit sie „im Wasser“ sitzen.
    this.makeTexture('pool-front', 320, 100, (g) => {
      const half = (cx: number, cy: number, rx: number, ry: number, reverse = false) => {
        const pts: Phaser.Math.Vector2[] = [];
        for (let i = 0; i <= 24; i++) {
          const a = (i / 24) * Math.PI;
          pts.push(new Phaser.Math.Vector2(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry));
        }
        return reverse ? pts.reverse() : pts;
      };
      g.fillStyle(0x8ecae6, 0.6);
      g.fillPoints(half(160, 46, 138, 35), true);
      g.fillStyle(0x4d96ff);
      g.fillPoints([...half(160, 50, 158, 48), ...half(160, 46, 138, 35, true)], true);
    });

    // Vorderer Rand des Whirlpools (über den Kindern, Wasser halbdurchsichtig)
    // Vorderer Teil des Whirlpools (liegt über den Kindern), gleiche Fläche wie die Whirlpool-Grafik
    this.makeTexture('whirlpool-front', 380, 230, (g) => drawWhirlpool(g, true));

    this.makeTexture('drop', 10, 14, (g) => {
      g.fillStyle(0x4cc9f0);
      g.fillCircle(5, 9, 5);
      g.fillTriangle(1, 8, 9, 8, 5, 0);
    });

    this.makeTexture('bucket-sand', 72, 26, (g) => {
      g.fillStyle(0xe9c46a);
      g.fillEllipse(36, 18, 72, 16);
      g.fillEllipse(36, 12, 50, 24);
    });

    this.makeTexture('sandcake', 72, 44, (g) => {
      g.fillStyle(0xd4a373);
      g.fillPoints(
        [new Phaser.Math.Vector2(14, 0), new Phaser.Math.Vector2(58, 0), new Phaser.Math.Vector2(70, 40), new Phaser.Math.Vector2(2, 40)],
        true,
      );
      g.fillStyle(0xe9c46a);
      for (let i = 0; i < 6; i++) g.fillCircle(8 + i * 11.2, 38, 7);
      g.fillStyle(0xf4d9a4);
      g.fillEllipse(36, 3, 40, 8);
    });

    const flowerColors = [0xff70a6, 0xffd166, 0x9b5de5, 0xff9770];
    flowerColors.forEach((color, i) =>
      this.makeTexture(`flower-${i}`, 40, 60, (g) => {
        g.lineStyle(4, 0x2d6a4f);
        g.lineBetween(20, 24, 20, 60);
        g.fillStyle(0x40916c);
        g.fillEllipse(28, 46, 14, 7);
        g.fillStyle(color);
        for (let p = 0; p < 5; p++) {
          const a = (p / 5) * Math.PI * 2;
          g.fillCircle(20 + Math.cos(a) * 9, 18 + Math.sin(a) * 9, 7);
        }
        g.fillStyle(0xffffff);
        g.fillCircle(20, 18, 5);
      }),
    );

    this.makeTexture('note', 30, 42, (g) => {
      g.fillStyle(0xffffff);
      g.fillEllipse(10, 34, 20, 14);
      g.fillRect(16, 4, 5, 32);
      g.fillTriangle(21, 4, 30, 12, 21, 18);
    });

    // Lichtkegel der Taschenlampe (wird additiv über die Szene geblendet)
    this.makeTexture('lightcone', 340, 200, (g) => {
      for (let i = 10; i >= 1; i--) {
        const r = i / 10;
        g.fillStyle(0xfff3b0, 0.06);
        g.fillTriangle(0, 100, 340 * r, 100 - 100 * r, 340 * r, 100 + 100 * r);
      }
    });

    this.makeTexture('sun', 180, 180, (g) => {
      g.fillStyle(0xffffff, 0.25);
      g.fillCircle(90, 90, 90);
      g.fillStyle(0xffffff);
      g.fillCircle(90, 90, 70);
    });

    this.makeTexture('moon', 150, 150, (g) => {
      g.fillStyle(0xfff8dc, 0.18);
      g.fillCircle(75, 75, 75);
      g.fillStyle(0xfff3c4);
      g.fillCircle(75, 75, 55);
      g.fillStyle(0xe9dca4);
      g.fillCircle(55, 62, 11);
      g.fillCircle(88, 92, 8);
      g.fillCircle(92, 55, 6);
    });

    this.makeTexture('cloud', 240, 120, (g) => {
      g.fillStyle(0xf4faff);
      g.fillCircle(60, 70, 45);
      g.fillCircle(115, 50, 55);
      g.fillCircle(175, 70, 45);
      g.fillRect(60, 70, 115, 45);
    });

    // Kleiner Funkelstern (Sterne nachts, Tau morgens)
    this.makeTexture('twinkle', 20, 20, (g) => {
      g.fillStyle(0xffffff);
      g.fillPoints(starPoints(10, 10, 10, 3.5), true);
    });

    // Leuchten einer Glühbirne (weiß, wird eingefärbt, über die Lichtebene gezeichnet)
    this.makeTexture('bulb', 36, 36, (g) => {
      g.fillStyle(0xffffff, 0.25);
      g.fillCircle(18, 18, 18);
      g.fillStyle(0xffffff, 0.9);
      g.fillCircle(18, 18, 7);
    });

    this.makeTexture('raindrop', 4, 22, (g) => {
      g.fillStyle(0xcfe8ff);
      g.fillRoundedRect(0, 0, 4, 22, 2);
    });

    this.makeTexture('puddle', 220, 64, (g) => {
      g.fillStyle(0x6fa8dc, 0.85);
      g.fillEllipse(110, 32, 220, 64);
      g.fillStyle(0xa9d6f5, 0.9);
      g.fillEllipse(96, 26, 150, 34);
      g.fillStyle(0xffffff, 0.6);
      g.fillEllipse(70, 20, 50, 8);
    });

    this.makeTexture('rainbow', 1000, 500, (g) => {
      const colors = [0xff595e, 0xff924c, 0xffca3a, 0x8ac926, 0x1982c4, 0x4267ac, 0x6a4c93];
      colors.forEach((c, i) => {
        g.lineStyle(26, c, 0.8);
        g.beginPath();
        g.arc(500, 500, 480 - i * 26, Math.PI, 0, false);
        g.strokePath();
      });
    });

    this.makeTexture('leaf', 26, 16, (g) => {
      g.fillStyle(0xffffff);
      g.fillEllipse(13, 8, 26, 14);
      g.lineStyle(2, 0xdddddd);
      g.lineBetween(2, 8, 24, 8);
    });

    this.makeTexture('snowflake', 14, 14, (g) => {
      g.fillStyle(0xffffff, 0.35);
      g.fillCircle(7, 7, 7);
      g.fillStyle(0xffffff);
      g.fillCircle(7, 7, 4);
    });

    // Mütze (weiß, wird in der Pulli-Farbe des Kindes eingefärbt)
    this.makeTexture('beanie', 100, 62, (g) => {
      g.fillStyle(0xffffff);
      g.slice(50, 58, 46, Math.PI, 0, false);
      g.fillPath();
      g.fillRoundedRect(2, 46, 96, 16, 7);
      g.fillCircle(50, 10, 10);
      g.fillStyle(0xdddddd);
      for (let x = 10; x < 95; x += 12) g.fillRect(x, 48, 4, 12);
    });

    TOYS.forEach((t) => this.makeTexture(t.id, t.width, t.height, TOY_PLACEHOLDERS[t.id]));

    this.scene.start('Playground');
  }

  /**
   * Kletter-Spielhaus (#65): Rückseite, Vorderseite mit ausgestanzten Löchern, Bogen und Sprossen
   * (Kinder und Bälle drinnen sieht man hindurch), Rutsche.
   */
  private makePlayhouse(): void {
    const { x, y, w, h } = HOUSE_AREA;
    this.makeTexture('playhouse-back', w, h, drawPlayhouseBack);
    this.makeTexture('playhouse-slide', SLIDE_AREA.w, SLIDE_AREA.h, drawPlayhouseSlide);
    if (this.textures.exists('playhouse-front')) return; // echte Grafik (mit durchsichtigen Löchern)
    this.makeTexture('playhouse-front-solid', w, h, drawPlayhouseFront);
    const canvas = this.textures.createCanvas('playhouse-front', w, h);
    if (!canvas) return;
    const ctx = canvas.context;
    ctx.drawImage(this.textures.get('playhouse-front-solid').getSourceImage() as CanvasImageSource, 0, 0);
    ctx.globalCompositeOperation = 'destination-out';
    for (const hole of [PH.bigHole, ...PH.holes]) {
      ctx.beginPath();
      ctx.arc(hole.x - x, hole.y - y, hole.r, 0, Math.PI * 2);
      ctx.fill();
    }
    const cut = (pts: Phaser.Math.Vector2[]) => {
      ctx.beginPath();
      pts.forEach((p, i) => (i ? ctx.lineTo(p.x - x, p.y - y) : ctx.moveTo(p.x - x, p.y - y)));
      ctx.closePath();
      ctx.fill();
    };
    cut(archOutline());
    rungSlots().forEach(cut);
    ctx.globalCompositeOperation = 'source-over';
    canvas.refresh();
    this.textures.remove('playhouse-front-solid');
  }

  /** Rakete und Weltall (#75): Vorderseite mit ausgestanztem Fenster, Flamme, Planeten, Ufo. */
  private makeSpace(): void {
    this.makeTexture('rocket-flame', FLAME_SIZE.width, FLAME_SIZE.height, drawFlame);
    for (const kind of Object.keys(PLANET_SIZE) as (keyof typeof PLANET_SIZE)[]) {
      this.makeTexture(`planet-${kind}`, PLANET_SIZE[kind].width, PLANET_SIZE[kind].height, (g) => drawPlanet(g, kind));
    }
    this.makeTexture('ufo-dome', UFO_SIZE.width, UFO_SIZE.height, (g) => drawUfo(g, 'dome'));
    this.makeTexture('ufo', UFO_SIZE.width, UFO_SIZE.height, (g) => drawUfo(g, 'saucer'));
    this.makeTexture('alien', ALIEN_SIZE.width, ALIEN_SIZE.height, drawAlien);
    this.makeTexture('alien-arm', ALIEN_ARM_SIZE.width, ALIEN_ARM_SIZE.height, drawAlienArm);
    this.makeTexture('shooting-star', SHOOTING_STAR_SIZE.width, SHOOTING_STAR_SIZE.height, drawShootingStar);

    if (this.textures.exists('rocket-front')) return; // echte Grafik (mit durchsichtigem Fenster)
    const { width: w, height: h, window: win } = ROCKET_ART;
    this.makeTexture('rocket-front-solid', w, h, (g) => drawRocket(g, 'front'));
    this.makeTexture('rocket-glass', w, h, drawRocketGlass);
    const canvas = this.textures.createCanvas('rocket-front', w, h);
    if (!canvas) return;
    const ctx = canvas.context;
    ctx.drawImage(this.textures.get('rocket-front-solid').getSourceImage() as CanvasImageSource, 0, 0);
    // Fenster ausstanzen (abgerundetes Rechteck), dann das Glas darüber
    ctx.globalCompositeOperation = 'destination-out';
    const { x, y, w: ww, h: wh, r } = win;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + ww, y, x + ww, y + wh, r);
    ctx.arcTo(x + ww, y + wh, x, y + wh, r);
    ctx.arcTo(x, y + wh, x, y, r);
    ctx.arcTo(x, y, x + ww, y, r);
    ctx.closePath();
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(this.textures.get('rocket-glass').getSourceImage() as CanvasImageSource, 0, 0);
    canvas.refresh();
    this.textures.remove('rocket-front-solid');
    this.textures.remove('rocket-glass');
  }

  /** Vorlage `mk-stencil-<id>`: das Papier mit der Form ausgestanzt (wie die Rakete: Canvas, destination-out). */
  private makeStencil(id: string): void {
    const key = `mk-stencil-${id}`;
    if (this.textures.exists(key)) return;
    const size = STENCIL.size;
    const canvas = this.textures.createCanvas(key, size, size);
    if (!canvas) return;
    const ctx = canvas.context;
    ctx.drawImage(this.textures.get('mk-paper').getSourceImage() as CanvasImageSource, 0, 0);
    // Alles außerhalb der Form voll deckend (sonst bleibt Kleber im Schatten/Rand der Vorlage)
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, size, size);
    ctx.globalCompositeOperation = 'destination-out';
    const o = (size - STENCIL.shapeSize) / 2;
    ctx.drawImage(this.textures.get(`mk-shape-${id}`).getSourceImage() as CanvasImageSource, o, o);
    ctx.globalCompositeOperation = 'source-over';
    canvas.refresh();
  }

  /** Kinderschminken: Zimmer, Becher, Stifte, Puder, Glitzerdosen, Schwamm, Spiegel. */
  private makeMakeup(): void {
    this.makeTexture('mk-bg', GAME_WIDTH, GAME_HEIGHT, drawMakeupBg);
    this.makeTexture('mk-cup', CUP_SIZE.width, CUP_SIZE.height, drawPenCup);
    this.makeTexture('mk-pen', PEN_SIZE.width, PEN_SIZE.height, drawPen);
    this.makeTexture('mk-pan', PAN_SIZE, PAN_SIZE, drawPan);
    this.makeTexture('mk-pan-fill', PAN_SIZE, PAN_SIZE, drawPanFill);
    this.makeTexture('mk-puff-handle', PUFF_HANDLE.width, PUFF_HANDLE.height, drawPuffHandle);
    this.makeTexture('mk-puff-head', PUFF_HEAD, PUFF_HEAD, drawPuffHead);
    this.makeTexture('mk-jar', JAR_SIZE.width, JAR_SIZE.height, drawJar);
    this.makeTexture('mk-jar-fill', JAR_SIZE.width, JAR_SIZE.height, drawJarFill);
    this.makeTexture('mk-jar-rainbow', JAR_SIZE.width, JAR_SIZE.height, drawJarRainbow);
    this.makeTexture('mk-sponge', MAKEUP_SPONGE_SIZE.width, MAKEUP_SPONGE_SIZE.height, drawMakeupSponge);
    this.makeTexture('mk-mirror', MIRROR.w, MIRROR.h, drawMirror);
    this.makeTexture('mk-dot', 64, 64, drawBrushDot);
    this.makeTexture('mk-grain', 16, 16, drawGrain);
    // Glitzertattoo: Umrisse, Vorlagen-Papier mit ausgestanzter Form, Bogen, Knöpfe, Kleber
    this.makeTexture('mk-paper', STENCIL.size, STENCIL.size, drawPaper);
    for (const id of SHAPES) {
      this.makeTexture(`mk-shape-${id}`, STENCIL.shapeSize, STENCIL.shapeSize, (g) => drawShape(g, id));
      this.makeStencil(id);
    }
    this.makeTexture('mk-curl', CURL_SIZE, CURL_SIZE, drawCurl);
    this.makeTexture('mk-sheet', SHEET.size + 12, SHEET.size + 14, drawSheet);
    this.makeTexture('mk-sw-face', MODE_SWITCH_SIZE, MODE_SWITCH_SIZE, (g) => drawModeSwitch(g, 'face'));
    this.makeTexture('mk-sw-arm', MODE_SWITCH_SIZE, MODE_SWITCH_SIZE, (g) => drawModeSwitch(g, 'arm'));
    this.makeTexture('mk-glue-pot', GLUE_POT_SIZE.width, GLUE_POT_SIZE.height, drawGluePot);
    this.makeTexture('mk-glue-brush', GLUE_BRUSH_SIZE.width, GLUE_BRUSH_SIZE.height, drawGlueBrush);
  }

  /** Tischtennis (Pong): Rasen, Platte von oben, zwei Schläger, Ball mit Schatten, Knöpfe 1P/2P. */
  private makePong(): void {
    this.makeTexture('pong-bg', GAME_WIDTH, GAME_HEIGHT, drawPongBg);
    this.makeTexture('pong-table', PONG_TABLE.w + TABLE_PAD * 2 + 20, PONG_TABLE.h + TABLE_PAD * 2 + 20, drawPongTable);
    this.makeTexture('pong-racket-red', RACKET_SIZE.width, RACKET_SIZE.height, (g) => drawRacket(g, 0xd62828));
    this.makeTexture('pong-racket-black', RACKET_SIZE.width, RACKET_SIZE.height, (g) => drawRacket(g, 0x212529));
    this.makeTexture('pong-ball', BALL_SIZE, BALL_SIZE, drawPongBall);
    this.makeTexture('pong-shadow', BALL_SIZE, BALL_SIZE, drawBallShadow);
    this.makeTexture('pong-mode-big', PONG_LAYOUT.choice.size, PONG_LAYOUT.choice.size, (g) => drawModeButton(g, PONG_LAYOUT.choice.size));
    this.makeTexture('pong-mode-small', PONG_LAYOUT.switch.size, PONG_LAYOUT.switch.size, (g) => drawModeButton(g, PONG_LAYOUT.switch.size));
  }

  /** Zaubertrank: Gartenecke, Eimer-Topf, Rührlöffel, Korb, 12 Zutaten, 8 Feen, Funke. */
  private makeBrew(): void {
    this.makeTexture('brew-bg', GAME_WIDTH, GAME_HEIGHT, drawBrewBg);
    this.makeTexture('brew-pot', POT_SIZE.width, POT_SIZE.height, drawPot);
    this.makeTexture('brew-rim', POT_SIZE.width, POT_SIZE.height, drawPotRim);
    this.makeTexture('brew-spoon', SPOON_SIZE.width, SPOON_SIZE.height, drawSpoon);
    this.makeTexture('brew-basket', BASKET_SIZE.width, BASKET_SIZE.height, drawBasket);
    this.makeTexture('brew-spark', SPARK_SIZE, SPARK_SIZE, drawSpark);
    for (const id of INGREDIENTS) this.makeTexture(`brew-${id}`, INGREDIENT_SIZE, INGREDIENT_SIZE, (g) => drawIngredient(g, id));
    for (const id of FAIRIES) this.makeTexture(`fairy-${id}`, FAIRY_SIZE.width, FAIRY_SIZE.height, (g) => drawFairy(g, id));
  }

  /** Sternenflug: Asteroiden in 3 Größen und mehreren Formen, Schuss-Stern, goldener Stern, Erde. */
  private makeAsteroids(): void {
    for (const size of [0, 1, 2] as RockSize[]) {
      const d = rockTextureSize(size);
      for (let shape = 0; shape < ROCK_SHAPES; shape++) this.makeTexture(`rock-${size}-${shape}`, d, d, (g) => drawRock(g, size, shape));
    }
    this.makeTexture('astro-shot', SHOT_SIZE.width, SHOT_SIZE.height, drawShot);
    this.makeTexture('gold-star', GOLD_STAR_SIZE, GOLD_STAR_SIZE, drawGoldStar);
    this.makeTexture('earth', EARTH_SIZE, EARTH_SIZE, drawEarth);
  }

  /** Grill-Spiel (#66): Hintergrund, Grill, Grillgut in 5 Garstufen, Teller, Flaschen, Tuch. */
  private makeGrill(): void {
    this.makeTexture('grill-bg', GAME_WIDTH, GAME_HEIGHT, drawGrillBackground);
    this.makeTexture('grill-front', GAME_WIDTH, GAME_HEIGHT, drawGrillFront);
    for (const id of [...FOOD_IDS, 'buncut'] as const) {
      const { width, height } = foodSize(id);
      for (let stage = 0; stage < STAGES; stage++) this.makeTexture(`food-${id}-${stage}`, width, height, (g) => drawFood(g, id, stage));
    }
    this.makeTexture('grill-plate', GRILL.plate.w, GRILL.plate.h, drawPlate);
    this.makeTexture('grill-bottle-ketchup', BOTTLE_SIZE.width, BOTTLE_SIZE.height, (g) => drawBottle(g, 0xd62828, 0xffffff));
    this.makeTexture('grill-bottle-mustard', BOTTLE_SIZE.width, BOTTLE_SIZE.height, (g) => drawBottle(g, 0xf2c230, 0x8a5a00));
    this.makeTexture('grill-cloth', CLOTH_SIZE.width, CLOTH_SIZE.height, drawCloth);
  }

  /** Ankleidekiste (#70): Kiste, Innenraum, Bügel und alle Verkleidungs-Teile. */
  private makeDressUp(): void {
    this.makeTexture('dressbox-inside', BOX.width, BOX.height, drawDressBoxInside);
    // Vorderseite mit ausgestanzter Tür: dahinter sieht man das Innere (und das Kind, das hineingeht)
    if (!this.textures.exists('dressbox')) {
      this.makeTexture('dressbox-solid', BOX.width, BOX.height, drawDressBox);
      const canvas = this.textures.createCanvas('dressbox', BOX.width, BOX.height);
      if (canvas) {
        const ctx = canvas.context;
        ctx.drawImage(this.textures.get('dressbox-solid').getSourceImage() as CanvasImageSource, 0, 0);
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        boxDoorOutline().forEach((p, i) => (i ? ctx.lineTo(p.x + BOX.footX, p.y + BOX.footY) : ctx.moveTo(p.x + BOX.footX, p.y + BOX.footY)));
        ctx.closePath();
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        canvas.refresh();
      }
      this.textures.remove('dressbox-solid');
    }
    this.makeTexture('dressup-room', GAME_WIDTH, GAME_HEIGHT, drawDressRoom);
    this.makeTexture('dressup-hanger', 80, 46, drawHanger);
    this.makeTexture('dressup-glow', 120, 120, drawItemGlow);
    for (const costume of COSTUMES) {
      for (const slot of SLOTS) {
        for (const art of COSTUME_ART[costume][slot]) {
          const { width, height } = layerLayout(art);
          this.makeTexture(costumeKey(costume, slot, art.layer), width, height, (g) => {
            g.translateCanvas(art.pad[0], art.pad[1]);
            art.draw(g);
          });
        }
      }
    }
  }

  /** Hintergrund wie der echte Hinterhof (#63): Häuser, Bäume, Büsche, Zaun- und Wiesen-Kacheln. */
  private makeBackdrop(): void {
    for (const [kind, spec] of Object.entries(HOUSE_SPECS) as [HouseKind, (typeof HOUSE_SPECS)[HouseKind]][]) {
      const key = houseKey(kind);
      this.makeTexture(key, spec.width, spec.height, spec.draw);
      this.makeTexture(`${key}-snow`, spec.width, spec.height, spec.drawSnow);
    }
    for (const kind of ['fir', 'tree'] as BackTreeKind[]) {
      const { width, height } = BACK_TREE_SIZE[kind];
      this.makeTexture(`bg-${kind}`, width, height, (g) => drawBackTree(g, kind));
    }
    for (const kind of ['green', 'dark', 'red', 'orange'] as BushKind[]) {
      this.makeTexture(`bush-${kind}`, BUSH_SIZE.width, BUSH_SIZE.height, (g) => drawBush(g, kind));
    }
    for (let i = 0; i < TILE_COUNT; i++) {
      const ox = i * GAME_WIDTH;
      this.makeTexture(`fence-${i}`, GAME_WIDTH, FENCE_TILE_HEIGHT, (g) => drawFence(g, ox, FENCE_TILE_TOP));
      this.makeTexture(`fence-snow-${i}`, GAME_WIDTH, FENCE_TILE_HEIGHT, (g) => drawFenceSnow(g, ox, FENCE_TILE_TOP));
      this.makeTexture(`meadow-${i}`, GAME_WIDTH, MEADOW_TILE_HEIGHT, (g) => drawMeadow(g, ox, GROUND_TOP));
    }
    PERGOLAS.forEach((_, i) => {
      const { w, h } = pergolaArea(i);
      this.makeTexture(`pergola-${i}`, w, h, (g) => drawPergola(g, i));
      this.makeTexture(`pergola-snow-${i}`, w, h, (g) => drawPergolaSnow(g, i));
    });
    // Felix' Garten (#64)
    this.makeTexture('felix-pergola', PERGOLA_AREA.w, PERGOLA_AREA.h, drawGardenPergola);
    this.makeTexture('felix-pergola-snow', PERGOLA_AREA.w, PERGOLA_AREA.h, drawGardenPergolaSnow);
    this.makeTexture('felix-vine', VINE_CURTAIN_SIZE.width, VINE_CURTAIN_SIZE.height, drawVineCurtain);
    this.makeTexture('felix-grill', GRILL_SIZE.width, GRILL_SIZE.height, drawGrill);
    this.makeTexture('felix-railing', RAILING_SIZE.width, RAILING_SIZE.height, drawRailing);
    this.makeTexture('felix-shed', SHED_AREA.w, SHED_AREA.h, drawShed);
    this.makeTexture('felix-shed-snow', SHED_AREA.w, SHED_AREA.h, drawShedSnow);
    this.makeTexture('felix-trunk', TRUNK_SIZE.width, TRUNK_SIZE.height, drawTrunk);
    this.makeTexture('felix-gate', GATE_SIZE.width, GATE_SIZE.height, drawGate);
    this.makeTexture('felix-lights', LIGHTS_AREA.w, LIGHTS_AREA.h, drawFairyLights);
    this.makeTexture('glow-soft', 128, 128, drawSoftGlow);
    this.makeDressUp();
    this.makeGrill();
    this.makeSpace();

    // Snackbox-Spiel
    this.makeTexture('snack-bg', GAME_WIDTH, GAME_HEIGHT, drawSnackBg);
    this.makeTexture('snack-plate', PLATE_SIZE.width, PLATE_SIZE.height, drawSnackPlate);
    this.makeTexture('snack-box', BOX_SIZE.width, BOX_SIZE.height, drawSnackBoxOpen);
    this.makeTexture('snack-card', CARD_SIZE.width, CARD_SIZE.height, drawCard);
    this.makeTexture('snack-sign', SNACK.exit.w + 10, SNACK.exit.h + 12, drawSnackSign);
    for (const id of SNACKS) this.makeTexture(`snack-${id}`, SNACK_SIZE, SNACK_SIZE, (g) => drawSnack(g, id));
    this.makeAsteroids();
    this.makeMakeup();
    this.makeBrew();
    this.makePong();
    this.makeTexture('window-glow', WINDOW_GLOW_SIZE.width, WINDOW_GLOW_SIZE.height, drawWindowGlow);
    this.makeTexture('smoke', 48, 48, drawSmoke);

    // Bunker (Buddeln mit der Schaufel)
    this.makeTexture('dig-hole', DIG_HOLE_SIZE.width, DIG_HOLE_SIZE.height, drawDigHole);
    this.makeTexture('dirt-pile', DIRT_PILE_SIZE.width, DIRT_PILE_SIZE.height, drawDirtPile);
    this.makeTexture('bunker-frame', BUNKER_FRAME_SIZE.width, BUNKER_FRAME_SIZE.height, drawBunkerFrame);
    this.makeTexture('bunker-lid', BUNKER_LID_SIZE.width, BUNKER_LID_SIZE.height, drawBunkerLid);
    this.makeTexture('bunker-wheel', BUNKER_WHEEL_SIZE.width, BUNKER_WHEEL_SIZE.height, drawBunkerWheel);
    // Hund (schwarzer Labrador) aus Einzelteilen
    this.makeTexture('dog-body', DOG_BODY_SIZE.width, DOG_BODY_SIZE.height, drawDogBody);
    this.makeTexture('dog-leg', DOG_LEG_SIZE.width, DOG_LEG_SIZE.height, drawDogLeg);
    this.makeTexture('dog-tail', DOG_TAIL_SIZE.width, DOG_TAIL_SIZE.height, drawDogTail);
    this.makeTexture('dog-head', DOG_HEAD_SIZE.width, DOG_HEAD_SIZE.height, (g) => drawDogHead(g, 'normal'));
    this.makeTexture('dog-head-open', DOG_HEAD_SIZE.width, DOG_HEAD_SIZE.height, (g) => drawDogHead(g, 'open'));
    this.makeTexture('dog-head-sleep', DOG_HEAD_SIZE.width, DOG_HEAD_SIZE.height, (g) => drawDogHead(g, 'sleep'));
    for (const c of CATS) {
      const tail = c.shortTail ? CAT_SHORT_TAIL_SIZE : CAT_TAIL_SIZE;
      this.makeTexture(catKey(c, 'body'), CAT_BODY_SIZE.width, CAT_BODY_SIZE.height, (g) => drawCatBody(g, c));
      this.makeTexture(catKey(c, 'leg'), CAT_LEG_SIZE.width, CAT_LEG_SIZE.height, (g) => drawCatLeg(g, c));
      this.makeTexture(catKey(c, 'tail'), tail.width, tail.height, (g) => drawCatTail(g, c));
      for (const face of CAT_FACES) {
        this.makeTexture(catKey(c, `head-${face}`), CAT_HEAD_SIZE.width, CAT_HEAD_SIZE.height, (g) => drawCatHead(g, c, face));
      }
    }
    // Steinterrasse mit Straßenmalkreide (Tor auf der Wiese, Malspiel dahinter)
    this.makeTexture('terrace-gate', TERRACE_GATE_SIZE.width, TERRACE_GATE_SIZE.height, drawTerraceGate);
    this.makeTexture('chalk-ground', GAME_WIDTH, GAME_HEIGHT, drawChalkGround);
    this.makeTexture('chalk-dot', CHALK_DOT_SIZE, CHALK_DOT_SIZE, drawChalkDot);
    this.makeTexture('chalk-eraser', ERASER_SIZE, ERASER_SIZE, drawEraser);
    this.makeTexture('chalk-tray', CHALK_LAYOUT.tray.w + 10, CHALK_LAYOUT.tray.h + 16, drawChalkTray);
    this.makeTexture('chalk-sponge', SPONGE_SIZE.width, SPONGE_SIZE.height, drawSponge);
    this.makeTexture('chalk-bucket', BUCKET_SIZE.width, BUCKET_SIZE.height, drawBucket);
    this.makeTexture('chalk-sign', CHALK_LAYOUT.exit.w + 10, CHALK_LAYOUT.exit.h + 12, drawExitSign);
    CHALK_COLORS.forEach((color, i) => {
      this.makeTexture(`chalk-stick-${i}`, CHALK_STICK_SIZE.width, CHALK_STICK_SIZE.height, (g) => drawChalkStick(g, color));
    });
    // Fotoleine für die Kamera
    this.makeTexture('photo-line', PHOTO_LINE_SIZE.width, PHOTO_LINE_SIZE.height, drawPhotoLine);
    this.makeTexture('photo-peg', PHOTO_PEG_SIZE.width, PHOTO_PEG_SIZE.height, drawPhotoPeg);

    // Strom-Werkstatt (Elektro-Baukasten)
    this.makeTexture('circuit-board', GAME_WIDTH, GAME_HEIGHT, drawBoard);
    this.makeTexture('circuit-battery', BATTERY_SIZE.width, BATTERY_SIZE.height, drawBattery);
    this.makeTexture('circuit-lamp', LAMP_SIZE.width, LAMP_SIZE.height, (g) => drawLamp(g, false));
    this.makeTexture('circuit-lamp-on', LAMP_SIZE.width, LAMP_SIZE.height, (g) => drawLamp(g, true));
    this.makeTexture('circuit-glow', GLOW_SIZE, GLOW_SIZE, drawGlow);
    this.makeTexture('circuit-switch', SWITCH_SIZE.width, SWITCH_SIZE.height, (g) => drawSwitch(g, false));
    this.makeTexture('circuit-switch-on', SWITCH_SIZE.width, SWITCH_SIZE.height, (g) => drawSwitch(g, true));
    this.makeTexture('circuit-bandaid', BANDAID_SIZE.width, BANDAID_SIZE.height, drawBandaid);
    for (const kind of ['and', 'or', 'not'] as const) {
      this.makeTexture(`circuit-${kind}`, LOGIC_GATE_SIZE.width, LOGIC_GATE_SIZE.height, (g) => drawLogicGate(g, kind));
    }
    this.makeTexture('circuit-slot-1', LOGIC_GATE_SIZE.width, LOGIC_GATE_SIZE.height, (g) => drawSlot(g, 1));
    this.makeTexture('circuit-slot-2', LOGIC_GATE_SIZE.width, LOGIC_GATE_SIZE.height, (g) => drawSlot(g, 2));
    this.makeTexture('circuit-tray', TRAY_SIZE.width, TRAY_SIZE.height, drawCircuitTray);
    this.makeTexture('circuit-sign', CIRCUIT.exit.w + 10, CIRCUIT.exit.h + 12, drawCircuitSign);
  }

  private makeTexture(
    key: string,
    width: number,
    height: number,
    draw: (g: Phaser.GameObjects.Graphics) => void,
  ): void {
    if (this.textures.exists(key)) return; // echte Grafik wurde in preload() geladen
    const g = this.add.graphics();
    draw(g);
    g.generateTexture(key, width, height);
    g.destroy();
  }
}

function starPoints(cx: number, cy: number, outer: number, inner: number): Phaser.Math.Vector2[] {
  const points: Phaser.Math.Vector2[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    points.push(new Phaser.Math.Vector2(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
  }
  return points;
}
