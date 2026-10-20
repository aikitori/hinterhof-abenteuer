// Nachbarskatzen: Ab und zu läuft eine über die Wiese (kommt über den Zaun) oder oben über
// einen Dachfirst. Maße in px (Weltkoordinaten), Zeiten in ms, Geschwindigkeiten in px/s.

export type CatId = 'black' | 'red' | 'tabby';

export interface CatDef {
  id: CatId;
  /** Fell, Fell hell (Glanz), Fell dunkel (Streifen, Ohren innen dunkel). */
  fur: number;
  light: number;
  dark: number;
  /** Bauch, Brust und Pfoten (ohne = wie das Fell). */
  belly?: number;
  /** Getigert: dunkle Streifen auf Rumpf, Kopf, Beinen und Schwanz. */
  stripes?: boolean;
  /** Kurzer Stummelschwanz. */
  shortTail?: boolean;
  eyes: number;
  /** Stimme fürs Miau: Tonhöhe 0–2 (Datei sounds/meow-<voice>.mp3). */
  voice: number;
}

export const CATS: CatDef[] = [
  { id: 'black', fur: 0x1f1d22, light: 0x3c3a44, dark: 0x0c0b0e, eyes: 0xc9d64a, voice: 0 },
  { id: 'red', fur: 0xe0782e, light: 0xf2a25c, dark: 0xb5541a, belly: 0xfaf4ea, eyes: 0x7fbf4a, voice: 1 },
  { id: 'tabby', fur: 0x8d8c88, light: 0xb4b2ac, dark: 0x4b4a47, stripes: true, shortTail: true, eyes: 0xd9a33a, voice: 2 },
];

export const CAT = {
  /** Ganze Figur auf der Wiese verkleinert (Teile sind in voller Größe gezeichnet). */
  scale: 0.55,
  /** Auf dem Dach: so viel kleiner als auf der Wiese (dazu kommt die Größe des Hauses). Etwas größer als
   *  perspektivisch richtig, damit man sie in der Ferne noch entdeckt. */
  roofScale: 0.6,
  walkSpeed: 95,
  runSpeed: 420,
  /** Pause zwischen zwei Besuchen. */
  pauseMin: 25_000,
  pauseMax: 55_000,
  /** Die erste Katze kommt etwas früher. */
  firstVisit: 12_000,
  /** Höchstens so viele Katzen gleichzeitig unterwegs. */
  maxOut: 2,
  /** Anteil der Besuche auf den Dächern (sonst über die Wiese). */
  roofShare: 0.4,
  /** Auf dem Zaun: nie an den Toren und nicht in Felix' Garten. */
  fenceAvoid: [
    [1680, 1900],
    [3960, 4210],
  ] as [number, number][],
  fenceMinX: 120,
  fenceMaxX: 4560,
  /** Auf der Wiese bleibt sie im oberen Teil (nah am Zaun). */
  meadowMinY: 760,
  meadowMaxY: 900,
  /** So weit streunt sie auf der Wiese höchstens vom Zaun-Platz weg. */
  wanderRange: 520,
  /** Ist der Hund wach und so nah, flüchtet sie auf den Zaun. */
  dogRange: 330,
  /** Kinder in diesem Abstand streicht sie um die Beine – sie kichern. */
  kidRange: 110,
  /** Antippen: so lange sitzt sie und schaut her. */
  lookMs: 2200,
};
