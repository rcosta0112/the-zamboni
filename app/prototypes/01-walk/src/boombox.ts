// The boombox on the crew quarters shelf. One action, no "Stop" (owner, 2026-10-13): each use moves
// it one step round a ring: track 1 → 2 → 3 → 4 → off → track 1. Every use plays the cassette sound
// first; the track starts when that ends. A track that ends by itself goes on to the next; the
// fourth ends in off. While a track plays the boombox shakes a little (as in the UE prototype).
// The sound comes from the boombox and falls off with distance (tuning panel, Sound).
// Plan: doc/plans/features/audio-from-ue.md (stage 6)

import * as THREE from 'three/webgpu';
import type { CueId, GameAudio } from './audio';
import type { Interactable } from './interaction';
import { settings } from './settings';

const CASSETTE: CueId = 'sfx_boombox_cassette';
const TRACKS: CueId[] = ['mus_boombox_01', 'mus_boombox_02', 'mus_boombox_03', 'mus_boombox_04'];

/** The shake at vibration 1: up to this far (m, in the ship file's units) and this much turn (rad). */
const SHAKE_MOVE = 0.0015;
const SHAKE_TURN = 0.004;

export class Boombox {
  /** 0 = off; 1 to 4: the track that's on, or about to start (while the cassette sound plays). */
  step = 0;
  readonly interactable: Interactable;
  private home = new THREE.Vector3();
  private homeTurn = new THREE.Euler();

  constructor(
    readonly object: THREE.Object3D,
    private audio: GameAudio,
  ) {
    this.home.copy(object.position);
    this.homeTurn.copy(object.rotation);
    this.interactable = {
      name: object.name,
      objects: [object],
      // The step it will take.
      verb: () => (this.step === 0 ? 'Play' : this.step === TRACKS.length ? 'Turn off' : 'Next track'),
      act: () => this.use(),
    };
  }

  /** The track that's sounding now (1 to 4), or 0. */
  get track(): number {
    return TRACKS.findIndex((cue) => this.audio.isPlaying(cue, this.object)) + 1;
  }

  use(): void {
    for (const cue of TRACKS) this.audio.stop(cue, this.object);
    this.step = this.step === TRACKS.length ? 0 : this.step + 1;
    const step = this.step;
    // Used again before the cassette sound ends: that sound starts again, and only the last use counts.
    if (!this.audio.play(CASSETTE, this.object, () => this.start(step))) this.start(step);
  }

  /** Per frame: the falloff from the tuning panel; the shake while a track plays. */
  update(): void {
    for (const cue of [CASSETTE, ...TRACKS]) this.audio.falloff(cue, this.object, settings.boomboxFullWithin, settings.boomboxGoneAt);
    const o = this.object;
    o.position.copy(this.home);
    o.rotation.copy(this.homeTurn);
    if (this.track === 0) return;
    const move = SHAKE_MOVE * settings.boomboxVibration;
    const turn = SHAKE_TURN * settings.boomboxVibration;
    o.position.x += (Math.random() * 2 - 1) * move;
    o.position.y += (Math.random() * 2 - 1) * move;
    o.position.z += (Math.random() * 2 - 1) * move;
    o.rotation.x += (Math.random() * 2 - 1) * turn;
    o.rotation.y += (Math.random() * 2 - 1) * turn;
    o.rotation.z += (Math.random() * 2 - 1) * turn;
  }

  private start(step: number): void {
    if (step === 0 || step !== this.step) return;
    this.audio.play(TRACKS[step - 1]!, this.object, () => {
      this.step = step === TRACKS.length ? 0 : step + 1;
      this.start(this.step);
    });
  }
}
