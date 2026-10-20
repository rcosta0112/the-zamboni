// Sound. Code plays a cue by its id (cues.json: file, bus, volume, where in the file it starts, its
// falloff if it's in the world); never a file path. One listener on the camera. Buses are gain
// nodes: master → music, ambience, sfx, ui (volumes in the tuning panel). Short sounds are decoded at
// load and kept; streamed ones (the music, the ship's noise) are an <audio> element fed into the
// graph, fetched when first played. A sound played "at" an object goes through Three's
// PositionalAudio: it falls off in a straight line from full (within `full` m) to nothing (`gone`).
// One voice per cue and place: playing it again starts it again, unless the cue's sounds may
// overlap (footsteps). A cue can have variations (`files`: one is picked, never the same twice
// running), a playback speed (`rate`: the hatches are the latches, lower) and a small random spread
// of it. The interactions' sounds and the footsteps each have a level of their own (`group`).
// Browsers keep sound off until the player does something: the context is resumed on the first key,
// click or gamepad button. One-shots asked for before that are dropped; the ship's noise follows
// its switch, so it starts once the sound is on; so does a cue that repeats (`setLoop`: the start
// screen's music).
// The files are placeholders (app/assets/test/audio/, SOURCES.md there).
// Plans: doc/plans/features/audio-from-ue.md, interaction-sounds.md, start-screen.md. Proposal they follow:
// doc/architecture/audio.md

import * as THREE from 'three/webgpu';
import cueData from './cues.json';
import { settings } from './settings';

const BASE = '/test/audio/';

type Bus = 'music' | 'ambience' | 'sfx' | 'ui';

interface Cue {
  file?: string;
  /** Variations: one is played, never the same twice running. */
  files?: string[];
  /** Several files that play together as one sound (the ship's noise). */
  layers?: string[];
  bus: string;
  volume?: number;
  /** Where in the file it starts (s). */
  offset?: number;
  stream?: boolean;
  /** It repeats: streamed, by `crossfade`; decoded, from end straight back to start until stopped. */
  loop?: boolean;
  /** A streamed loop repeats by fading its end into its start over this long (s). */
  crossfade?: number;
  falloff?: { full: number; gone: number };
  /** Playback speed (1: as recorded; lower is slower and deeper). */
  rate?: number;
  /** Each time it plays, its speed is off by up to this share, at random. */
  spread?: number;
  /** Playing it again doesn't cut off the one still sounding. */
  overlap?: boolean;
  /** It fades in over this long (s). */
  fadeIn?: number;
  /** Which level in the tuning panel it follows, besides its bus. */
  group?: string;
}

export type CueId = keyof typeof cueData;
const cues: Record<CueId, Cue> = cueData;

interface Voice {
  /** The cue's volume; what feeds it is the buffer source or the <audio> element. */
  out: GainNode;
  positional: THREE.PositionalAudio | null;
  element: HTMLAudioElement | null;
  source: AudioBufferSourceNode | null;
  playing: boolean;
  /** The variation played last. */
  last: string | null;
}

/** The ship's noise fades in and out over this long (s). */
const NOISE_FADE = 1.5;

export class GameAudio {
  readonly listener = new THREE.AudioListener();
  readonly context: AudioContext;
  /** How many times each cue was started: for checks. */
  readonly started: Partial<Record<CueId, number>> = {};
  private buses: Record<Bus, GainNode>;
  private buffers = new Map<string, AudioBuffer>();
  private voices = new Map<string, Voice>();
  private noise: StreamLoop[] | null = null;
  private noiseAmount = 0;
  /** Streamed cues that repeat, each faded in and out (`setLoop`). */
  private loops = new Map<CueId, { stream: StreamLoop; amount: number; on: boolean; fade: number; level: number }>();
  /** Decoded sounds: how many there are, and how many have arrived (or failed). */
  private toLoad = 0;
  private settled = 0;
  /** The player has done something the browser accepts for turning the sound on. */
  private unlocked = false;
  private paused = false;
  /** The streamed sounds that were playing when the game was paused. */
  private held: HTMLAudioElement[] = [];

  constructor(camera: THREE.Camera) {
    camera.add(this.listener);
    const context = this.listener.context as AudioContext;
    this.context = context;
    const bus = () => {
      const gain = context.createGain();
      gain.connect(this.listener.getInput());
      return gain;
    };
    this.buses = { music: bus(), ambience: bus(), sfx: bus(), ui: bus() };
    const files = Object.values(cues).flatMap((cue: Cue) => (cue.stream ? [] : [...(cue.files ?? []), ...(cue.file ? [cue.file] : [])]));
    const unique = new Set(files);
    this.toLoad = unique.size;
    for (const file of unique) {
      fetch(BASE + file)
        .then((response) => response.arrayBuffer())
        .then((data) => context.decodeAudioData(data))
        .then((buffer) => this.buffers.set(file, buffer))
        .catch((err: unknown) => console.warn(`[0.0.2] sound "${file}" not loaded:`, err))
        .finally(() => this.settled++);
    }
    window.addEventListener('keydown', () => this.unlock());
    window.addEventListener('pointerdown', () => this.unlock());
  }

  /** The share of the decoded sounds that are ready to play (0..1): for the start screen's bar. */
  get loadedShare(): number {
    return this.toLoad === 0 ? 1 : this.settled / this.toLoad;
  }

  /**
   * Turn the sound on: call from something the player did (a key, a click, a gamepad button).
   * @returns once it's on (or the browser refused)
   */
  unlock(): Promise<void> {
    this.unlocked = true;
    if (this.paused || this.context.state !== 'suspended') return Promise.resolve();
    return this.context.resume().catch(() => undefined);
  }

  /**
   * A streamed cue that repeats (the start screen's music, the wind): on or off, fading over `fade`
   * s. It sounds only once the sound is on, and starts from its beginning each time it comes back.
   * @param level how loud, as a share of the cue's volume (eased; it can change every frame)
   */
  setLoop(id: CueId, on: boolean, fade = 1, level = 1): void {
    const cue: Cue = cues[id];
    let loop = this.loops.get(id);
    if (!loop) {
      if (!on || !cue.file) return;
      loop = { stream: new StreamLoop(this.context, BASE + cue.file, this.buses[cue.bus as Bus], cue.crossfade ?? 2), amount: 0, on, fade, level };
      this.loops.set(id, loop);
    }
    loop.on = on;
    loop.fade = fade;
    loop.level = level;
  }

  /**
   * The game is paused: every sound stops where it is, and goes on from there afterwards. The
   * context is suspended (decoded sounds stop with it); streamed ones are paused themselves.
   */
  setPaused(on: boolean): void {
    if (on === this.paused) return;
    this.paused = on;
    if (on) {
      const loops = [...this.loops.values()].flatMap((l) => l.stream.elements);
      const elements = [...this.voices.values()].map((v) => v.element).concat(this.noise?.flatMap((n) => n.elements) ?? [], loops);
      this.held = elements.filter((e): e is HTMLAudioElement => e !== null && !e.paused && !e.ended);
      for (const element of this.held) element.pause();
      if (this.context.state === 'running') void this.context.suspend().catch(() => undefined);
    } else {
      if (this.unlocked) void this.context.resume().catch(() => undefined);
      for (const element of this.held) void element.play().catch(() => undefined);
      this.held = [];
    }
  }

  /**
   * Start a cue, from the beginning if it's already playing there.
   * @param at the object it comes from (not given: heard the same everywhere)
   * @param onEnded when it reaches its end by itself (not when stopped or started again)
   * @param level how loud this time, as a share of the cue's volume
   * @returns false if it was dropped: the sound isn't on yet, or the file isn't loaded
   */
  play(id: CueId, at?: THREE.Object3D, onEnded?: () => void, level = 1): boolean {
    const cue: Cue = cues[id];
    if (this.paused || this.context.state !== 'running') return false;
    const voice = this.voice(id, cue, at);
    const others = cue.files?.filter((f) => f !== voice.last) ?? [];
    const file = others.length > 0 ? others[Math.floor(Math.random() * others.length)]! : (cue.files?.[0] ?? cue.file);
    if (!file) return false;
    const buffer = cue.stream ? null : this.buffers.get(file);
    if (!cue.stream && !buffer) return false;
    voice.last = file;
    if (!cue.overlap) this.halt(voice);
    const now = this.context.currentTime;
    const volume = (cue.volume ?? 1) * level * (cue.group === 'interaction' ? settings.volumeInteraction : cue.group === 'steps' ? settings.volumeSteps : 1);
    voice.out.gain.cancelScheduledValues(now);
    if (cue.fadeIn) {
      voice.out.gain.setValueAtTime(0, now);
      voice.out.gain.linearRampToValueAtTime(volume, now + cue.fadeIn);
    } else {
      voice.out.gain.setValueAtTime(volume, now);
    }
    const ended = () => {
      voice.playing = false;
      onEnded?.();
    };
    if (buffer) {
      const source = this.context.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = (cue.rate ?? 1) * (1 + (Math.random() * 2 - 1) * (cue.spread ?? 0));
      // A decoded sound that repeats (the jetpack) goes round until it's stopped.
      source.loop = cue.loop === true;
      source.connect(voice.out);
      source.onended = () => {
        source.disconnect();
        // An earlier one of an overlapping cue ending doesn't end the cue.
        if (voice.source === source) ended();
      };
      source.start(0, cue.offset ?? 0);
      voice.source = source;
    } else {
      const element = (voice.element ??= this.element(file, voice.out));
      element.currentTime = cue.offset ?? 0;
      element.onended = ended;
      void element.play().catch(() => (voice.playing = false));
    }
    voice.playing = true;
    this.started[id] = (this.started[id] ?? 0) + 1;
    return true;
  }

  /** @param fade it dies away over this long (s) instead of stopping dead (decoded sounds only) */
  stop(id: CueId, at?: THREE.Object3D, fade = 0): void {
    const voice = this.voices.get(key(id, at));
    if (!voice) return;
    if (fade > 0 && voice.source) {
      const now = this.context.currentTime;
      voice.out.gain.cancelScheduledValues(now);
      voice.out.gain.setTargetAtTime(0, now, fade / 4);
      voice.source.onended = null;
      voice.source.stop(now + fade);
      voice.source = null;
      voice.playing = false;
    } else {
      this.halt(voice);
    }
  }

  /**
   * Change a sounding cue's level (share of its volume) and speed (share of its rate), eased over a
   * few hundredths of a second (the jetpack following the trigger).
   */
  shape(id: CueId, level: number, rate: number, at?: THREE.Object3D): void {
    const voice = this.voices.get(key(id, at));
    if (!voice?.playing) return;
    const cue: Cue = cues[id];
    const now = this.context.currentTime;
    voice.out.gain.setTargetAtTime((cue.volume ?? 1) * level, now, 0.03);
    voice.source?.playbackRate.setTargetAtTime((cue.rate ?? 1) * rate, now, 0.03);
  }

  isPlaying(id: CueId, at?: THREE.Object3D): boolean {
    return this.voices.get(key(id, at))?.playing ?? false;
  }

  /** Change a placed cue's falloff (it starts with the cue's own): full within, gone at (m). */
  falloff(id: CueId, at: THREE.Object3D, full: number, gone: number): void {
    const positional = this.voices.get(key(id, at))?.positional;
    if (!positional) return;
    positional.setRefDistance(full);
    positional.setMaxDistance(Math.max(gone, full + 0.01));
  }

  /** The cues that are sounding now: for checks. */
  playing(): string[] {
    const list = [...this.voices].filter(([, v]) => v.playing).map(([k]) => k.split('@')[0]!);
    if (this.noise?.some((n) => n.playing)) list.push('amb_ship_noise');
    for (const [id, loop] of this.loops) if (loop.stream.playing) list.push(id);
    return list;
  }

  /**
   * Per frame: the volumes from the tuning panel, the cues that repeat, and the ship's noise.
   * @param indoors 0..1, eased: she's inside the ship
   */
  update(dt: number, indoors: number): void {
    if (this.paused) return;
    const now = this.context.currentTime;
    this.listener.gain.gain.setTargetAtTime(settings.soundMute ? 0 : settings.volumeMaster, now, 0.02);
    this.buses.music.gain.setTargetAtTime(settings.volumeMusic, now, 0.02);
    this.buses.ambience.gain.setTargetAtTime(settings.volumeAmbience, now, 0.02);
    this.buses.sfx.gain.setTargetAtTime(settings.volumeSfx, now, 0.02);
    this.buses.ui.gain.setTargetAtTime(settings.volumeUi, now, 0.02);
    const running = this.context.state === 'running';

    for (const [id, loop] of this.loops) {
      const target = loop.on && running ? 1 : 0;
      // The first frame's dt can be below zero (the frame's time is from before the loop was set up).
      const step = loop.fade > 0 ? Math.max(0, dt) / loop.fade : 1;
      loop.amount = loop.amount < target ? Math.min(target, loop.amount + step) : Math.max(target, loop.amount - step);
      if (loop.amount === 0 && target === 0) {
        loop.stream.stop();
        continue;
      }
      if (loop.stream.start()) this.started[id] = (this.started[id] ?? 0) + 1;
      loop.stream.update((cues[id].volume ?? 1) * loop.amount * loop.level);
    }

    // The ship's noise: its two files loop together while the ship is flying, each at its own level
    // (the owner's mix, until they're one file), quieter outside the ship.
    const target = settings.shipFlying && running ? 1 : 0;
    const step = dt / NOISE_FADE;
    this.noiseAmount = this.noiseAmount < target ? Math.min(target, this.noiseAmount + step) : Math.max(target, this.noiseAmount - step);
    if (this.noiseAmount === 0 && target === 0) {
      if (this.noise) for (const loop of this.noise) loop.stop();
      return;
    }
    const cue = cues.amb_ship_noise;
    this.noise ??= (cue.layers ?? []).map((file) => new StreamLoop(this.context, BASE + file, this.buses.ambience, cue.crossfade ?? 2));
    const where = THREE.MathUtils.lerp(settings.shipNoiseOutdoors, 1, indoors);
    const levels = [settings.shipNoiseA, settings.shipNoiseB];
    for (const [i, loop] of this.noise.entries()) {
      loop.start();
      loop.update((cue.volume ?? 1) * this.noiseAmount * where * (levels[i] ?? 1));
    }
  }

  private voice(id: CueId, cue: Cue, at?: THREE.Object3D): Voice {
    const k = key(id, at);
    let voice = this.voices.get(k);
    if (voice) return voice;
    const out = this.context.createGain();
    const bus = this.buses[cue.bus as Bus];
    let positional: THREE.PositionalAudio | null = null;
    if (at) {
      positional = new THREE.PositionalAudio(this.listener);
      positional.panner.panningModel = 'equalpower';
      positional.setDistanceModel('linear');
      positional.setRolloffFactor(1);
      positional.setRefDistance(cue.falloff?.full ?? 1.5);
      positional.setMaxDistance(cue.falloff?.gone ?? 12);
      positional.setNodeSource(out as unknown as AudioScheduledSourceNode);
      // Through its bus, not straight to the listener.
      positional.gain.disconnect();
      positional.gain.connect(bus);
      at.add(positional);
    } else {
      out.connect(bus);
    }
    voice = { out, positional, element: null, source: null, playing: false, last: null };
    this.voices.set(k, voice);
    return voice;
  }

  private element(file: string, out: AudioNode): HTMLAudioElement {
    const element = new Audio(BASE + file);
    element.preload = 'auto';
    this.context.createMediaElementSource(element).connect(out);
    return element;
  }

  private halt(voice: Voice): void {
    if (voice.source) {
      voice.source.onended = null;
      voice.source.stop();
      voice.source.disconnect();
      voice.source = null;
    }
    if (voice.element) {
      voice.element.onended = null;
      voice.element.pause();
    }
    voice.playing = false;
  }
}

const key = (id: CueId, at?: THREE.Object3D) => `${id}@${at?.uuid ?? ''}`;

/**
 * A streamed file that repeats. An <audio> element's own loop leaves a gap where it starts again,
 * and these files' ends don't match their starts anyway (they're recordings, not loops): so two
 * elements play the same file in turn, the end of one fading into the start of the other.
 */
class StreamLoop {
  readonly elements: [HTMLAudioElement, HTMLAudioElement];
  private gains: [GainNode, GainNode];
  private out: GainNode;
  private active: 0 | 1 = 0;
  private on = false;

  constructor(private context: AudioContext, url: string, to: AudioNode, private crossfade: number) {
    this.out = context.createGain();
    this.out.gain.value = 0;
    this.out.connect(to);
    const one = (): [HTMLAudioElement, GainNode] => {
      const element = new Audio(url);
      element.preload = 'auto';
      const gain = context.createGain();
      context.createMediaElementSource(element).connect(gain).connect(this.out);
      return [element, gain];
    };
    const [a, b] = [one(), one()];
    this.elements = [a[0], b[0]];
    this.gains = [a[1], b[1]];
  }

  get playing(): boolean {
    return this.on && this.elements.some((e) => !e.paused);
  }

  /** @returns true if it wasn't on: it starts from the file's beginning */
  start(): boolean {
    if (this.on) return false;
    this.on = true;
    this.begin(this.elements[this.active]);
    return true;
  }

  stop(): void {
    if (!this.on) return;
    this.on = false;
    for (const element of this.elements) element.pause();
  }

  /** Per frame, while it's on. */
  update(volume: number): void {
    const now = this.context.currentTime;
    this.out.gain.setTargetAtTime(volume, now, 0.02);
    let a = this.elements[this.active];
    let b = this.elements[1 - this.active]!;
    if (a.ended) {
      // The other one has taken over (or, after a while in a hidden tab, takes over now).
      if (b.paused) this.begin(b);
      this.active = this.active === 0 ? 1 : 0;
      [a, b] = [b, a];
    }
    // No duration yet (still loading): no fade.
    const left = a.duration - a.currentTime;
    const p = left <= this.crossfade ? THREE.MathUtils.clamp(1 - left / this.crossfade, 0, 1) : 0;
    if (p > 0 && b.paused) this.begin(b);
    // Equal power: the two are unrelated noise, so their loudness adds up evenly this way.
    this.gains[this.active].gain.setTargetAtTime(Math.cos((p * Math.PI) / 2), now, 0.02);
    this.gains[1 - this.active]!.gain.setTargetAtTime(Math.sin((p * Math.PI) / 2), now, 0.02);
  }

  private begin(element: HTMLAudioElement): void {
    element.currentTime = 0;
    void element.play().catch(() => undefined);
  }
}
