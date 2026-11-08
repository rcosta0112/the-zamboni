// A small synth in plain Web Audio (owner, 2026-11-08: no library), for sounds made in code
// instead of recorded: a patch (wave, low-pass filter, envelope, reverb) playing a pattern (notes
// held for as long as it plays, and a line of notes stepping over them, looping). A light input
// (0..1, each frame) dims it, so a sound can flicker with a light. Tuned on synth.html.
// Plan: doc/plans/features/synth.md.

export type Wave = 'square' | 'sawtooth' | 'triangle' | 'sine';

export interface Patch {
  /** Oscillator 1, on or off: its wave, level (0..1), and pitch from the note's (octaves,
   *  semitones, cents; owner, 2026-11-08). */
  osc1: boolean;
  wave: Wave;
  level1: number;
  osc1Octave: number;
  osc1Semis: number;
  osc1Detune: number;
  /** Oscillator 2 (owner, 2026-11-08), the same, also from the note's pitch (not oscillator 1's).
   *  Both go through the same envelope and filter. */
  osc2: boolean;
  osc2Wave: Wave;
  level2: number;
  osc2Octave: number;
  osc2Semis: number;
  osc2Detune: number;
  volume: number; // 0..1, the whole sound
  /** Low-pass filter: cutoff in Hz, resonance 0..1 (a synth's slider; see `resonanceToQ`). */
  cutoff: number;
  resonance: number;
  /** Envelope: seconds, seconds, level 0..1, seconds. */
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  /** Reverb: its tail's length (s, to -60 dB) and how much of it is heard (0: dry, 1: all reverb). */
  reverbTime: number;
  reverbMix: number;
  /** Notes held as long as it plays, e.g. "C4" or "C4 E4" (scientific pitch: C4 is middle C). */
  held: string;
  /** A line of notes over them, one every `step` seconds, looping, e.g. "G4 A4 B4 A4". Empty: none. */
  line: string;
  step: number;
  /** The line's notes slide into each other (`glide` seconds) instead of each starting again. */
  legato: boolean;
  glide: number;
  /** At the light's darkest (0), the volume dips this share and the cutoff this many octaves. */
  lightDepth: number;
  lightCutoff: number;
}

const LOOKAHEAD = 0.3; // s: notes are put on the audio clock this far ahead, so steps don't drift
const TICK = 100; // ms between looks ahead

/** "C4", "F#3", "Bb2" → Hz (A4 = 440). NaN if it isn't a note. */
export function noteToHz(note: string): number {
  const m = /^([A-Ga-g])([#b]?)(-?\d)$/.exec(note.trim());
  if (!m) return NaN;
  const semis: Record<string, number> = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
  const midi = 12 * (Number(m[3]) + 1) + semis[m[1]!.toLowerCase()]! + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  return 440 * 2 ** ((midi - 69) / 12);
}

const notes = (text: string): number[] => text.split(/[\s,]+/).map(noteToHz).filter((hz) => hz > 0);

/** Resonance 0..1 → the filter's Q: 0.707 (flat, no peak) × 2^(5r); 0.43 → about 3.1, 1 → about 23. */
export function resonanceToQ(resonance: number): number {
  return 0.707 * 2 ** (5 * Math.max(0, Math.min(1, resonance)));
}

/** An oscillator's offset from the note, in cents (octaves, semitones and fine detune together). */
const osc1Cents = (p: Patch) => 1200 * p.osc1Octave + 100 * p.osc1Semis + p.osc1Detune;
const osc2Cents = (p: Patch) => 1200 * p.osc2Octave + 100 * p.osc2Semis + p.osc2Detune;

/** One note: the oscillators that are on, mixed, through one envelope. */
class Voice {
  private osc1: OscillatorNode;
  private osc2: OscillatorNode;
  private level1: GainNode;
  private level2: GainNode;
  private env: GainNode;

  constructor(context: AudioContext, p: Patch, hz: number, to: AudioNode) {
    this.osc1 = new OscillatorNode(context, { type: p.wave, frequency: hz, detune: osc1Cents(p) });
    this.osc2 = new OscillatorNode(context, { type: p.osc2Wave, frequency: hz, detune: osc2Cents(p) });
    this.level1 = new GainNode(context);
    this.level2 = new GainNode(context);
    this.env = new GainNode(context, { gain: 0 });
    this.osc1.connect(this.level1).connect(this.env);
    this.osc2.connect(this.level2).connect(this.env);
    this.env.connect(to);
    this.apply(p, true);
  }

  /** The oscillators' settings, live (the envelope's from the next note on). */
  apply(p: Patch, now = false): void {
    const t = this.osc1.context.currentTime;
    const set = (param: AudioParam, value: number) =>
      now ? param.setValueAtTime(value, t) : param.setTargetAtTime(value, t, 0.02);
    this.osc1.type = p.wave;
    this.osc2.type = p.osc2Wave;
    set(this.level1.gain, p.osc1 ? p.level1 : 0);
    set(this.osc1.detune, osc1Cents(p));
    set(this.level2.gain, p.osc2 ? p.level2 : 0);
    set(this.osc2.detune, osc2Cents(p));
  }

  /** Moves to a new note at `at`, sliding `glide` seconds from `fromHz` (legato). */
  slide(at: number, fromHz: number, hz: number, glide: number): void {
    for (const f of [this.osc1.frequency, this.osc2.frequency]) {
      f.cancelScheduledValues(at);
      f.setValueAtTime(fromHz, at);
      if (glide > 0) f.exponentialRampToValueAtTime(hz, at + glide);
      else f.setValueAtTime(hz, at);
    }
  }

  start(at: number, p: Patch): void {
    const g = this.env.gain;
    g.setValueAtTime(0, at);
    g.linearRampToValueAtTime(1, at + Math.max(0.001, p.attack));
    g.linearRampToValueAtTime(p.sustain, at + Math.max(0.001, p.attack) + Math.max(0.001, p.decay));
    this.osc1.start(at);
    this.osc2.start(at);
  }

  /** Fades out from wherever the envelope is at `at`, then stops. */
  release(at: number, p: Patch): void {
    const g = this.env.gain;
    g.cancelAndHoldAtTime(at);
    g.linearRampToValueAtTime(0, at + Math.max(0.001, p.release));
    const end = at + Math.max(0.001, p.release) + 0.05;
    this.osc1.stop(end);
    this.osc2.stop(end);
  }
}

export class Synth {
  private filter: BiquadFilterNode;
  private reverb: ConvolverNode;
  private dry: GainNode;
  private wet: GainNode;
  private master: GainNode;
  private lightGain: GainNode;
  private held: Voice[] = [];
  private lineVoice: Voice | null = null;
  private lineHz = 0; // the line's last note, for a legato slide to start from
  private stepIndex = 0;
  private nextStep = 0;
  private timer = 0;
  private light = 1;
  private builtReverbTime = -1;

  constructor(readonly context: AudioContext, private patch: Patch, to: AudioNode = context.destination) {
    this.filter = new BiquadFilterNode(context, { type: 'lowpass' });
    this.reverb = new ConvolverNode(context);
    this.dry = new GainNode(context);
    this.wet = new GainNode(context);
    this.master = new GainNode(context);
    this.lightGain = new GainNode(context);
    this.filter.connect(this.dry).connect(this.master);
    this.filter.connect(this.reverb).connect(this.wet).connect(this.master);
    this.master.connect(this.lightGain).connect(to);
    this.set(patch, true);
  }

  get playing(): boolean {
    return this.timer !== 0;
  }

  /** The filter's Q as used (linear, not dB), for the page to show. */
  get q(): number {
    return resonanceToQ(this.patch.resonance);
  }

  /** Takes a changed patch: levels and the filter at once; envelope changes from the next note on. */
  set(patch: Patch, now = false): void {
    const old = this.patch;
    this.patch = patch;
    const t = this.context.currentTime;
    const smooth = (param: AudioParam, value: number) =>
      now ? param.setValueAtTime(value, t) : param.setTargetAtTime(value, t, 0.02);
    smooth(this.master.gain, patch.volume);
    // Equal-power mix, so turning the reverb up doesn't make it louder overall.
    smooth(this.dry.gain, Math.cos((patch.reverbMix * Math.PI) / 2));
    smooth(this.wet.gain, Math.sin((patch.reverbMix * Math.PI) / 2));
    // Web Audio reads a low-pass filter's Q in dB.
    smooth(this.filter.Q, 20 * Math.log10(resonanceToQ(patch.resonance)));
    this.applyLight(now);
    if (patch.reverbTime !== this.builtReverbTime) this.buildReverb();
    for (const v of [...this.held, this.lineVoice]) v?.apply(patch);
    // New notes: start them again.
    if (this.playing && (patch.held !== old.held || patch.line !== old.line || patch.legato !== old.legato)) {
      this.stop();
      this.play();
    }
  }

  /** The light this frame, 0 (dark) .. 1 (full). */
  setLight(light: number): void {
    this.light = Math.max(0, Math.min(1, light));
    this.applyLight(false);
  }

  play(): void {
    if (this.playing) return;
    const t = this.context.currentTime + 0.05;
    this.held = notes(this.patch.held).map((hz) => this.voice(hz, t));
    this.stepIndex = 0;
    this.nextStep = t;
    this.schedule();
    this.timer = window.setInterval(() => this.schedule(), TICK);
  }

  /** Stops (each note released as the patch says), then lets go of its nodes. */
  dispose(): void {
    this.stop();
    const gone = Math.max(0.05, this.patch.release) + 0.1;
    window.setTimeout(() => this.lightGain.disconnect(), gone * 1000);
  }

  stop(): void {
    if (!this.playing) return;
    window.clearInterval(this.timer);
    this.timer = 0;
    const t = this.context.currentTime;
    for (const v of this.held) v.release(t, this.patch);
    this.lineVoice?.release(t, this.patch);
    this.held = [];
    this.lineVoice = null;
  }

  private voice(hz: number, at: number): Voice {
    const v = new Voice(this.context, this.patch, hz, this.filter);
    v.start(at, this.patch);
    return v;
  }

  /** Puts the line's next notes on the audio clock, up to `LOOKAHEAD` ahead. */
  private schedule(): void {
    const line = notes(this.patch.line);
    if (!line.length) return;
    const ahead = this.context.currentTime + LOOKAHEAD;
    while (this.nextStep < ahead) {
      const at = this.nextStep;
      const hz = line[this.stepIndex % line.length]!;
      if (this.patch.legato && this.lineVoice) {
        this.lineVoice.slide(at, this.lineHz, hz, this.patch.glide);
      } else {
        this.lineVoice?.release(at, this.patch);
        this.lineVoice = this.voice(hz, at);
      }
      this.lineHz = hz;
      this.stepIndex++;
      this.nextStep += Math.max(0.05, this.patch.step);
    }
  }

  private applyLight(now: boolean): void {
    const dark = 1 - this.light;
    const t = this.context.currentTime;
    const gain = 1 - this.patch.lightDepth * dark;
    const cutoff = Math.min(this.context.sampleRate / 2, this.patch.cutoff * 2 ** (-this.patch.lightCutoff * dark));
    // Fast (10 ms), so a flicker's quick dips come through.
    if (now) {
      this.lightGain.gain.setValueAtTime(gain, t);
      this.filter.frequency.setValueAtTime(cutoff, t);
    } else {
      this.lightGain.gain.setTargetAtTime(gain, t, 0.01);
      this.filter.frequency.setTargetAtTime(cutoff, t, 0.01);
    }
  }

  /** The reverb's tail: stereo noise fading to -60 dB over `reverbTime`. */
  private buildReverb(): void {
    const seconds = Math.max(0.05, this.patch.reverbTime);
    const rate = this.context.sampleRate;
    const length = Math.ceil(seconds * rate);
    const buffer = this.context.createBuffer(2, length, rate);
    for (let c = 0; c < 2; c++) {
      const data = buffer.getChannelData(c);
      for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp((-6.9 * i) / length);
    }
    this.reverb.buffer = buffer;
    this.builtReverbTime = this.patch.reverbTime;
  }
}
