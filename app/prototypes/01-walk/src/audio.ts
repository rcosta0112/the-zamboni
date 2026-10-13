// Sound. Code plays a cue by its id (cues.json: file, bus, volume, where in the file it starts, its
// falloff if it's in the world); never a file path. One listener on the camera. Buses are gain
// nodes: master → music, ambience, sfx (volumes in the tuning panel). Short sounds are decoded at
// load and kept; streamed ones (the music, the ship's noise) are an <audio> element fed into the
// graph, fetched when first played. A sound played "at" an object goes through Three's
// PositionalAudio: it falls off in a straight line from full (within `full` m) to nothing (`gone`).
// One voice per cue and place: playing it again starts it again.
// Browsers keep sound off until the player does something: the context is resumed on the first key,
// click or gamepad button. One-shots asked for before that are dropped; the ship's noise follows
// its switch, so it starts once the sound is on.
// The files are placeholders from the UE prototype (app/assets/test/audio/, SOURCES.md there).
// Plan: doc/plans/features/audio-from-ue.md. Proposal it follows: doc/architecture/audio.md

import * as THREE from 'three/webgpu';
import cueData from './cues.json';
import { settings } from './settings';

const BASE = '/test/audio/';

type Bus = 'music' | 'ambience' | 'sfx';

interface Cue {
  file?: string;
  /** Several files that play together as one sound (the ship's noise). */
  layers?: string[];
  bus: string;
  volume?: number;
  /** Where in the file it starts (s). */
  offset?: number;
  stream?: boolean;
  loop?: boolean;
  /** A streamed loop repeats by fading its end into its start over this long (s). */
  crossfade?: number;
  falloff?: { full: number; gone: number };
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

  constructor(camera: THREE.Camera) {
    camera.add(this.listener);
    const context = this.listener.context as AudioContext;
    this.context = context;
    const bus = () => {
      const gain = context.createGain();
      gain.connect(this.listener.getInput());
      return gain;
    };
    this.buses = { music: bus(), ambience: bus(), sfx: bus() };
    for (const cue of Object.values(cues)) {
      if (cue.stream || !cue.file) continue;
      const file = cue.file;
      fetch(BASE + file)
        .then((response) => response.arrayBuffer())
        .then((data) => context.decodeAudioData(data))
        .then((buffer) => this.buffers.set(file, buffer))
        .catch((err: unknown) => console.warn(`[01-walk] sound "${file}" not loaded:`, err));
    }
    window.addEventListener('keydown', () => this.unlock());
    window.addEventListener('pointerdown', () => this.unlock());
  }

  /** Turn the sound on: call from something the player did (a key, a click, a gamepad button). */
  unlock(): void {
    if (this.context.state === 'suspended') void this.context.resume().catch(() => undefined);
  }

  /**
   * Start a cue, from the beginning if it's already playing there.
   * @param at the object it comes from (not given: heard the same everywhere)
   * @param onEnded when it reaches its end by itself (not when stopped or started again)
   * @returns false if it was dropped: the sound isn't on yet, or the file isn't loaded
   */
  play(id: CueId, at?: THREE.Object3D, onEnded?: () => void): boolean {
    const cue = cues[id];
    if (this.context.state !== 'running' || !cue.file) return false;
    const buffer = cue.stream ? null : this.buffers.get(cue.file);
    if (!cue.stream && !buffer) return false;
    const voice = this.voice(id, cue, at);
    this.halt(voice);
    voice.out.gain.value = cue.volume ?? 1;
    const ended = () => {
      voice.playing = false;
      onEnded?.();
    };
    if (buffer) {
      const source = this.context.createBufferSource();
      source.buffer = buffer;
      source.connect(voice.out);
      source.onended = ended;
      source.start(0, cue.offset ?? 0);
      voice.source = source;
    } else {
      const element = (voice.element ??= this.element(cue.file, voice.out));
      element.currentTime = cue.offset ?? 0;
      element.onended = ended;
      void element.play().catch(() => (voice.playing = false));
    }
    voice.playing = true;
    this.started[id] = (this.started[id] ?? 0) + 1;
    return true;
  }

  stop(id: CueId, at?: THREE.Object3D): void {
    const voice = this.voices.get(key(id, at));
    if (voice) this.halt(voice);
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
    return list;
  }

  /**
   * Per frame: the volumes from the tuning panel, and the ship's noise.
   * @param indoors 0..1, eased: she's inside the ship
   */
  update(dt: number, indoors: number): void {
    const now = this.context.currentTime;
    this.listener.gain.gain.setTargetAtTime(settings.soundMute ? 0 : settings.volumeMaster, now, 0.02);
    this.buses.music.gain.setTargetAtTime(settings.volumeMusic, now, 0.02);
    this.buses.ambience.gain.setTargetAtTime(settings.volumeAmbience, now, 0.02);
    this.buses.sfx.gain.setTargetAtTime(settings.volumeSfx, now, 0.02);

    // The ship's noise: its two files loop together while the ship is flying, each at its own level
    // (the owner's mix, until they're one file), quieter outside the ship.
    const running = this.context.state === 'running';
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
    voice = { out, positional, element: null, source: null, playing: false };
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
  private elements: [HTMLAudioElement, HTMLAudioElement];
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

  start(): void {
    if (this.on) return;
    this.on = true;
    this.begin(this.elements[this.active]);
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
