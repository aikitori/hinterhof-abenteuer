// Welche Töne es gibt und wie sie klingen, solange keine Datei da ist.
//
// Datei für einen Ton: public/assets/sounds/<kind>.mp3 (auch .ogg/.wav/.m4a),
// mit Tonhöhe: <kind>-<pitch>.mp3 (z. B. xylophone-0.mp3 … xylophone-7.mp3).
// Stimmen fürs Zählen: sounds/voices/<kid-id>/count-<n>.mp3, sonst sounds/voices/default/…
// Fehlt eine Datei, spielt src/audio/Sound.ts den Platzhalter-Ton (`synth`).

/** Ereignis, das alles sendet, was klingen soll: scene.events.emit('sound', …). */
export interface SoundEvent {
  kind: string;
  /** Tonhöhe (z. B. Xylophon-Platte 0–7). */
  pitch?: number;
  /** Zählen: welche Zahl (1–10). */
  value?: number;
  /** Zählen: Stimme welches Kindes (Kind-id). */
  voice?: string;
  /** Weltposition für leichtes Stereo (links/rechts im sichtbaren Ausschnitt). */
  x?: number;
}

/** Platzhalter-Klänge, per WebAudio erzeugt. */
export type SynthId =
  | 'honk'
  | 'drum'
  | 'mallet'
  | 'pop'
  | 'bubble'
  | 'splash'
  | 'click'
  | 'chime'
  | 'whoosh'
  | 'kick'
  | 'beep'
  | 'rise'
  | 'bark'
  | 'meow'
  | 'zap'
  | 'crack'
  | 'tock';

export interface SoundDef {
  synth: SynthId;
  /** Mit Tonhöhe (Datei <kind>-<pitch>, Platzhalter in der passenden Tonhöhe). */
  pitched?: boolean;
  /** Lautstärke 0..1 (Standard 0.6). */
  volume?: number;
}

export const SOUNDS: Record<string, SoundDef> = {
  honk: { synth: 'honk' },
  drum: { synth: 'drum', volume: 0.8 },
  xylophone: { synth: 'mallet', pitched: true },
  pop: { synth: 'pop' },
  bubble: { synth: 'bubble', volume: 0.35 },
  splash: { synth: 'splash' },
  click: { synth: 'click', volume: 0.4 },
  kick: { synth: 'kick', volume: 0.5 },
  peekaboo: { synth: 'chime' },
  daytime: { synth: 'chime', volume: 0.4 },
  'sprinkler-on': { synth: 'splash', volume: 0.4 },
  'sprinkler-off': { synth: 'click', volume: 0.3 },
  gust: { synth: 'whoosh', volume: 0.4 },
  'weather-sunny': { synth: 'chime', volume: 0.35 },
  'weather-cloudy': { synth: 'whoosh', volume: 0.25 },
  'weather-rain': { synth: 'splash', volume: 0.3 },
  'weather-wind': { synth: 'whoosh', volume: 0.35 },
  'weather-snow': { synth: 'chime', volume: 0.3 },
  // Grill-Spiel (#66)
  sizzle: { synth: 'splash', volume: 0.12 },
  wipe: { synth: 'whoosh', volume: 0.2 },
  cut: { synth: 'click', volume: 0.45 },
  squirt: { synth: 'whoosh', volume: 0.35 },
  yum: { synth: 'chime', volume: 0.45 },
  yuck: { synth: 'honk', volume: 0.3 },
  // Rakete und Weltall (#75)
  // Kein Dauer-Triebwerk (nervt): ein fröhliches „Fiuuu“ beim Start, sonst nur Ereignisse
  liftoff: { synth: 'rise', volume: 0.4 },
  rocket: { synth: 'rise', volume: 0.22 },
  'rocket-land': { synth: 'kick', volume: 0.45 },
  clouds: { synth: 'whoosh', volume: 0.2 },
  space: { synth: 'chime', volume: 0.3 },
  planet: { synth: 'mallet', pitched: true, volume: 0.45 },
  ufo: { synth: 'beep', volume: 0.3 },
  'shooting-star': { synth: 'chime', volume: 0.18 },
  // Bunker: buddeln, Luke gefunden, Luke klappert
  dig: { synth: 'whoosh', volume: 0.18 },
  'bunker-found': { synth: 'chime', volume: 0.5 },
  hatch: { synth: 'drum', volume: 0.5 },
  // Hund
  bark: { synth: 'bark', volume: 0.55 },
  'dog-catch': { synth: 'pop', volume: 0.4 },
  'dog-shake': { synth: 'splash', volume: 0.3 },
  // Katzen (pitch = welche Katze)
  meow: { synth: 'meow', pitched: true, volume: 0.45 },
  // Steinterrasse mit Straßenmalkreide
  chalk: { synth: 'whoosh', volume: 0.12 },
  'chalk-pick': { synth: 'click', volume: 0.4 },
  // Kamera: Auslöser, Foto hängt an der Leine
  camera: { synth: 'click', volume: 0.8 },
  photo: { synth: 'pop', volume: 0.3 },
  // Strom-Werkstatt
  'circuit-switch': { synth: 'click', volume: 0.6 },
  'circuit-wire': { synth: 'pop', volume: 0.45 },
  'circuit-unwire': { synth: 'click', volume: 0.35 },
  'circuit-gate': { synth: 'kick', volume: 0.5 },
  'circuit-nope': { synth: 'honk', volume: 0.15 },
  'circuit-lamp': { synth: 'rise', volume: 0.35 },
  'circuit-win': { synth: 'chime', volume: 0.55 },
  // Snackbox-Spiel
  'snack-take': { synth: 'pop', volume: 0.4 },
  'snack-put': { synth: 'mallet', pitched: true, volume: 0.5 },
  'snack-back': { synth: 'click', volume: 0.35 },
  'snack-nope': { synth: 'honk', volume: 0.15 },
  'snack-win': { synth: 'chime', volume: 0.55 },
  // Zaubertrank: Zutat nehmen, hineinfallen, rühren (blubbert), Fee erscheint
  'brew-take': { synth: 'pop', volume: 0.35 },
  'brew-add': { synth: 'splash', volume: 0.4 },
  'brew-stir': { synth: 'bubble', volume: 0.35 },
  'brew-fairy': { synth: 'chime', volume: 0.55 },
  // Sternenflug (Asteroiden): Warp hinein, Stern-Schuss, Stein zerbricht (tiefer = größer),
  // Glitzer (Tonhöhe steigt mit jedem kleinen Stein), Zusammenstoß, Welle geschafft
  warp: { synth: 'rise', volume: 0.5 },
  zap: { synth: 'zap', volume: 0.25 },
  crack: { synth: 'crack', pitched: true, volume: 0.5 },
  sparkle: { synth: 'mallet', pitched: true, volume: 0.4 },
  bonk: { synth: 'drum', volume: 0.45 },
  'wave-done': { synth: 'chime', volume: 0.5 },
  // Tischtennis
  'pong-hit': { synth: 'tock', pitched: true, volume: 0.6 },
  'pong-table': { synth: 'tock', pitched: true, volume: 0.35 },
  'pong-miss': { synth: 'pop', volume: 0.3 },
  'pong-star': { synth: 'chime', volume: 0.5 },
  // Kinderschminken
  paint: { synth: 'whoosh', volume: 0.07 },
  puff: { synth: 'pop', volume: 0.12 },
  glitter: { synth: 'click', volume: 0.12 },
  'tattoo-done': { synth: 'chime', volume: 0.5 },
  glue: { synth: 'bubble', volume: 0.3 },
  peel: { synth: 'whoosh', volume: 0.35 },
};

/** Unbekannte Ereignisse: kurzer, leiser Pieps statt Stille oder Fehler. */
export const FALLBACK_SOUND: SoundDef = { synth: 'beep', volume: 0.3 };

/** Tonhöhen für Xylophon & Co.: C-Dur ab c'' (Hz). */
export const SCALE = [523.25, 587.33, 659.25, 698.46, 783.99, 880.0, 987.77, 1046.5];
