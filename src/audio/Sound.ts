import Phaser from 'phaser';
import soundFiles from 'virtual:sound-files';
import { GAME_WIDTH } from '../config';
import { FALLBACK_SOUND, SCALE, SOUNDS, type SoundDef, type SoundEvent, type SynthId } from '../data/sounds';

// Höchstens so viele Töne gleichzeitig (Regen, Sprenger … sollen nicht knattern).
const MAX_VOICES = 8;
// Gleiche Töne kurz hintereinander werden zusammengefasst (ms).
const SAME_KIND_GAP = 40;
// Wie stark links/rechts im Bild auf die Lautsprecher verteilt wird (0..1).
const PAN_AMOUNT = 0.6;
const EXTENSIONS = ['mp3', 'ogg', 'm4a', 'wav'];
// Wie lange ein Platzhalter-Ton ungefähr klingt (s), um die Stimmen zu zählen.
const SYNTH_LENGTH: Record<SynthId, number> = {
  honk: 0.3,
  drum: 0.25,
  mallet: 0.6,
  pop: 0.12,
  bubble: 0.07,
  splash: 0.35,
  click: 0.03,
  kick: 0.1,
  chime: 0.62,
  whoosh: 0.7,
  beep: 0.08,
  rise: 0.75,
  bark: 0.15,
  meow: 0.55,
  zap: 0.12,
  crack: 0.3,
  tock: 0.06,
};

/**
 * Tonausgabe: hört auf `scene.events` 'sound' und spielt die passende Datei – oder, solange es
 * keine gibt, einen Platzhalter-Ton per WebAudio. Fehlende Dateien, fehlendes WebAudio oder
 * fehlende Sprachausgabe führen nie zu Fehlern, schlimmstenfalls bleibt es still.
 *
 * Browser und WebView erlauben Ton erst nach einer Berührung: Der AudioContext entsteht beim
 * ersten Tippen (ohne Knopf oder Hinweis); Töne davor fallen einfach weg.
 */
export class SoundSystem {
  private ctx?: AudioContext;
  private master?: GainNode;
  private active = 0;
  private readonly lastPlayed = new Map<string, number>();
  private readonly buffers = new Map<string, Promise<AudioBuffer | null>>();
  private readonly files = new Set(soundFiles);
  /** Für Tests und Fehlersuche: was zuletzt wie abgespielt wurde. */
  readonly stats = { played: 0, skipped: 0, last: '' };

  constructor(private readonly scene: Phaser.Scene) {
    const unlock = () => this.unlock();
    scene.input.on('pointerdown', unlock);
    scene.events.on('sound', (e: SoundEvent) => this.safely(() => this.handle(e)));
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.input.off('pointerdown', unlock);
      void this.ctx?.close().catch(() => undefined);
    });
  }

  /** Ton freischalten (beim ersten Tippen). */
  private unlock(): void {
    this.safely(() => {
      if (!this.ctx) {
        const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return;
        this.ctx = new Ctor();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.8;
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume().catch(() => undefined);
    });
    // Sprachausgabe hat ihre Stimmen oft erst später bereit.
    this.safely(() => window.speechSynthesis?.getVoices());
  }

  private handle(e: SoundEvent): void {
    if (!e || typeof e.kind !== 'string') return;
    if (e.kind === 'count') {
      this.count(e);
      return;
    }
    const def = SOUNDS[e.kind] ?? FALLBACK_SOUND;
    const pitch = def.pitched && typeof e.pitch === 'number' ? e.pitch : undefined;
    const key = pitch === undefined ? e.kind : `${e.kind}-${pitch}`;
    const now = performance.now();
    if (now - (this.lastPlayed.get(key) ?? -Infinity) < SAME_KIND_GAP) return;
    this.lastPlayed.set(key, now);
    const file = this.findFile(`sounds/${key}`);
    if (file) this.playFile(file, def.volume ?? 0.6, this.pan(e.x), () => this.synth(def, pitch, e.x));
    else this.synth(def, pitch, e.x);
  }

  // --- Zählen -----------------------------------------------------------------

  /** Stimme des Kindes → Standardstimme → Sprachausgabe (de-DE) → n kurze Töne. */
  private count(e: SoundEvent): void {
    const n = Math.round(e.value ?? 0);
    if (n < 1) return;
    const own = e.voice ? this.findFile(`sounds/voices/${e.voice}/count-${n}`) : undefined;
    const file = own ?? this.findFile(`sounds/voices/default/count-${n}`);
    const speakOrBeep = () => {
      if (!this.speak(n)) this.beeps(n, e.x);
    };
    if (file) this.playFile(file, 0.9, this.pan(e.x), speakOrBeep);
    else speakOrBeep();
  }

  private speak(n: number): boolean {
    try {
      const synth = window.speechSynthesis;
      if (!synth || typeof SpeechSynthesisUtterance === 'undefined') return false;
      const german = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith('de'));
      if (!german) return false;
      const u = new SpeechSynthesisUtterance(String(n));
      u.lang = german.lang || 'de-DE';
      try {
        u.voice = german;
      } catch {
        // manche Geräte melden Stimmen, die sich nicht setzen lassen: dann nur die Sprache
      }
      u.rate = 0.9;
      u.pitch = 1.2;
      synth.speak(u);
      this.note(`speech:${n}`);
      return true;
    } catch {
      return false;
    }
  }

  private beeps(n: number, x?: number): void {
    if (!this.takeVoice(n * 0.14)) return;
    for (let i = 0; i < n; i++) {
      this.scene.time.delayedCall(i * 140, () =>
        this.safely(() => this.tone({ freq: 660 + i * 40, type: 'sine', dur: 0.09, vol: 0.4, pan: this.pan(x) })),
      );
    }
    this.note(`beeps:${n}`);
  }

  // --- Dateien ----------------------------------------------------------------

  private findFile(base: string): string | undefined {
    for (const ext of EXTENSIONS) if (this.files.has(`${base}.${ext}`)) return `${base}.${ext}`;
    return undefined;
  }

  private playFile(path: string, volume: number, pan: number, fallback: () => void): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || ctx.state !== 'running' || this.active >= MAX_VOICES) {
      this.stats.skipped++;
      return;
    }
    this.load(path).then(
      (buffer) =>
        this.safely(() => {
          if (!buffer) return fallback();
          if (!this.takeVoice(buffer.duration)) return;
          const src = ctx.createBufferSource();
          src.buffer = buffer;
          const gain = ctx.createGain();
          gain.gain.value = volume;
          this.connect(src, gain, pan);
          src.start();
          this.note(`file:${path}`);
        }),
      () => this.safely(fallback),
    );
  }

  private load(path: string): Promise<AudioBuffer | null> {
    let p = this.buffers.get(path);
    if (!p) {
      const ctx = this.ctx!;
      p = fetch(`${import.meta.env.BASE_URL}assets/${path}`)
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
        .then((data) => ctx.decodeAudioData(data))
        .catch(() => null); // kaputt oder nicht lesbar: dann eben der Platzhalter
      this.buffers.set(path, p);
    }
    return p;
  }

  // --- Platzhalter-Töne -------------------------------------------------------

  /** Ist Ton bereit und noch eine Stimme frei? Belegt sie dann für `dur` Sekunden. */
  private takeVoice(dur: number): boolean {
    if (!this.ctx || !this.master || this.ctx.state !== 'running' || this.active >= MAX_VOICES) {
      this.stats.skipped++;
      return false;
    }
    this.active++;
    setTimeout(() => (this.active = Math.max(0, this.active - 1)), (dur + 0.05) * 1000);
    return true;
  }

  private synth(def: SoundDef, pitch: number | undefined, x?: number): void {
    if (!this.takeVoice(SYNTH_LENGTH[def.synth])) return;
    const vol = def.volume ?? 0.6;
    const pan = this.pan(x);
    const id: SynthId = def.synth;
    switch (id) {
      case 'honk':
        this.tone({ freq: 220, type: 'square', dur: 0.28, vol: vol * 0.35, pan });
        this.tone({ freq: 277, type: 'square', dur: 0.28, vol: vol * 0.35, pan });
        break;
      case 'drum':
        this.tone({ freq: 140, to: 55, type: 'sine', dur: 0.25, vol, pan });
        this.noise({ dur: 0.06, vol: vol * 0.4, filter: 900, pan });
        break;
      case 'mallet': {
        const f = SCALE[Phaser.Math.Clamp(Math.round(pitch ?? 0), 0, SCALE.length - 1)];
        this.tone({ freq: f, type: 'triangle', dur: 0.6, vol, pan, attack: 0.003 });
        this.tone({ freq: f * 4, type: 'sine', dur: 0.12, vol: vol * 0.15, pan, attack: 0.002 });
        break;
      }
      case 'pop':
        this.tone({ freq: 700, to: 180, type: 'sine', dur: 0.12, vol, pan });
        break;
      case 'bubble':
        this.tone({ freq: 900, to: 1500, type: 'sine', dur: 0.07, vol, pan });
        break;
      case 'splash':
        this.noise({ dur: 0.35, vol, filter: 2500, pan });
        break;
      case 'click':
        this.tone({ freq: 2000, type: 'square', dur: 0.03, vol: vol * 0.5, pan });
        break;
      case 'kick':
        this.tone({ freq: 120, to: 60, type: 'sine', dur: 0.1, vol, pan });
        break;
      case 'chime':
        this.tone({ freq: 784, type: 'sine', dur: 0.4, vol, pan });
        this.scene.time.delayedCall(120, () => this.safely(() => this.tone({ freq: 1047, type: 'sine', dur: 0.5, vol, pan })));
        break;
      case 'whoosh':
        this.noise({ dur: 0.7, vol, filter: 600, pan, attack: 0.25 });
        break;
      case 'beep':
        this.tone({ freq: 880, type: 'sine', dur: 0.08, vol, pan });
        break;
      case 'rise':
        // Aufsteigendes „Fiuuu“ (Rakete startet), weich und kurz
        this.tone({ freq: 260, to: 1040, type: 'sine', dur: 0.7, vol, pan, attack: 0.08 });
        this.tone({ freq: 390, to: 1560, type: 'triangle', dur: 0.55, vol: vol * 0.25, pan, attack: 0.08 });
        break;
      case 'bark':
        // Kurzes „Wuff“: rauer Ton, der schnell nach unten fällt
        this.tone({ freq: 520, to: 280, type: 'sawtooth', dur: 0.13, vol: vol * 0.3, pan, attack: 0.005 });
        this.tone({ freq: 260, to: 150, type: 'square', dur: 0.12, vol: vol * 0.18, pan, attack: 0.005 });
        this.noise({ dur: 0.05, vol: vol * 0.25, filter: 1500, pan });
        break;
      case 'meow': {
        // „Mi-auu“: steigt an und fällt wieder, jede Katze etwas anders hoch
        const f = 560 * [1, 1.2, 0.85][Phaser.Math.Clamp(Math.round(pitch ?? 0), 0, 2)];
        this.tone({ freq: f, to: f * 1.5, type: 'triangle', dur: 0.2, vol, pan, attack: 0.04 });
        this.tone({ freq: f * 2, to: f * 3, type: 'sine', dur: 0.2, vol: vol * 0.15, pan, attack: 0.04 });
        this.scene.time.delayedCall(180, () =>
          this.safely(() => this.tone({ freq: f * 1.5, to: f * 0.8, type: 'triangle', dur: 0.36, vol, pan, attack: 0.01 })),
        );
        break;
      }
      case 'zap':
        // Kurzes, helles „Piu“ (Stern-Schuss)
        this.tone({ freq: 1500, to: 600, type: 'sine', dur: 0.12, vol, pan, attack: 0.004 });
        break;
      case 'crack': {
        // Stein zerbricht: dumpfer Schlag mit Bröseln, tiefer je größer (pitch klein = groß)
        const f = SCALE[Phaser.Math.Clamp(Math.round(pitch ?? 0), 0, SCALE.length - 1)] / 2;
        this.tone({ freq: f, to: f * 0.5, type: 'triangle', dur: 0.25, vol, pan, attack: 0.003 });
        this.noise({ dur: 0.18, vol: vol * 0.5, filter: 1800, pan });
        break;
      }
      case 'tock': {
        // Tischtennis: kurzes, helles „Tock“ (höher je pitch)
        const f = SCALE[Phaser.Math.Clamp(Math.round(pitch ?? 4), 0, SCALE.length - 1)] * 2;
        this.tone({ freq: f, to: f * 0.7, type: 'triangle', dur: 0.06, vol, pan, attack: 0.002 });
        this.noise({ dur: 0.025, vol: vol * 0.3, filter: 3500, pan });
        break;
      }
    }
    this.note(`synth:${id}`);
  }

  private tone(o: { freq: number; to?: number; type: OscillatorType; dur: number; vol: number; pan: number; attack?: number }): void {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = o.type;
    osc.frequency.setValueAtTime(o.freq, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + o.dur);
    const gain = ctx.createGain();
    const attack = o.attack ?? 0.01;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, o.vol), t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    this.connect(osc, gain, o.pan);
    osc.start(t);
    osc.stop(t + o.dur + 0.02);
  }

  private noise(o: { dur: number; vol: number; filter: number; pan: number; attack?: number }): void {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const t = ctx.currentTime;
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * o.dur), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = o.filter;
    const gain = ctx.createGain();
    const attack = o.attack ?? 0.01;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, o.vol), t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    src.connect(filter);
    this.connect(filter, gain, o.pan);
    src.start(t);
  }

  /** Quelle → Lautstärke → Stereo → Master. */
  private connect(node: AudioNode, gain: GainNode, pan: number): void {
    const ctx = this.ctx!;
    node.connect(gain);
    let out: AudioNode = gain;
    if (typeof ctx.createStereoPanner === 'function') {
      const panner = ctx.createStereoPanner();
      panner.pan.value = pan;
      gain.connect(panner);
      out = panner;
    }
    out.connect(this.master!);
  }

  /** Weltposition → links (−) / rechts (+) im sichtbaren Ausschnitt. */
  private pan(x?: number): number {
    if (typeof x !== 'number' || !Number.isFinite(x)) return 0;
    const screenX = x - this.scene.cameras.main.scrollX;
    return Phaser.Math.Clamp((screenX / GAME_WIDTH) * 2 - 1, -1, 1) * PAN_AMOUNT;
  }

  private note(what: string): void {
    this.stats.played++;
    this.stats.last = what;
  }

  /** Ton darf das Spiel nie stören: jeder Fehler wird geschluckt. */
  private safely(fn: () => unknown): void {
    try {
      fn();
    } catch {
      this.stats.skipped++;
    }
  }
}
