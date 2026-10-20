// In-engine cutscenes: a track (`public/test/cutscenes/<id>.json`) of shots, each a camera's keys,
// an event track of commands (commands.ts) at their times, and the end state, the commands that leave
// the world as the cutscene ends. The player draws through its own camera, so the game's camera keeps
// its place behind her and the hand-back is that camera again. While it plays she stands still, nothing
// can be used and the see-through is off (main.ts: the camera is authored). *Skip* jumps to the end
// state: the events not yet run are left out, the end state covers them. The test one,
// `test-ship-shots`, is written by `tools/test-cutscene.mjs`; one authored in Blender (`cs-<id>.glb`)
// will be read into the same shape. Dev builds: `__cutscene().play('<id>')`, `skip()`.
// Plan: doc/plans/architecture/game-architecture/game-structure.md (*Cutscenes*, pass 5)

import * as THREE from 'three/webgpu';
import { fromBlender, type Command } from './commands';

/** A camera key: where it is and which way it looks, in the ship file's Blender coordinates. */
export interface CameraKey {
  /** Seconds from the cutscene's start. */
  t: number;
  at: [number, number, number];
  /** Degrees about Blender's Z, from +X toward +Y (as Blender turns an object); lower turns right. */
  heading: number;
  /** Degrees up from level. */
  pitch: number;
  /** Vertical field of view, degrees. */
  fov: number;
}

export interface Shot {
  /** Seconds from the cutscene's start; it lasts until the next shot's start, or the end. */
  start: number;
  /** Two keys or more, eased linearly between (one holds still). */
  camera: CameraKey[];
  /** The camera's far plane (m): a far-off shot needs more than the game's. */
  far?: number;
  /** Only `off` for now; later `her` or another target's id (plan, *Cutscenes*). */
  seeThrough: 'off';
}

export interface Track {
  id: string;
  /** Seconds. */
  duration: number;
  shots: Shot[];
  /** Commands at their times. */
  events: { t: number; command: Command }[];
  /** How it leaves the world: run at its end, and by *skip*. */
  end: Command[];
}

const DEG = Math.PI / 180;

export class CutscenePlayer {
  /** What the cutscene shows through; main.ts renders with it while one plays. */
  readonly camera = new THREE.PerspectiveCamera(55, 1, 0.1, 500);
  /** The track playing, or null. */
  track: Track | null = null;
  /** Seconds into it. */
  time = 0;
  /** Called once a cutscene has ended (played out or skipped): the checkpoint, later. */
  onEnded: ((id: string) => void) | null = null;
  private nextEvent = 0;

  constructor(
    /** The ship's object: the keys are in its file's coordinates. */
    private readonly ship: THREE.Object3D,
    private readonly run: (command: Command) => void,
  ) {}

  get playing(): boolean {
    return this.track !== null;
  }

  async play(id: string): Promise<void> {
    const response = await fetch(`/test/cutscenes/${id}.json`);
    if (!response.ok) throw new Error(`no cutscene "${id}" (${response.status})`);
    const track = (await response.json()) as Track;
    track.events.sort((a, b) => a.t - b.t);
    this.track = track;
    this.time = 0;
    this.nextEvent = 0;
    console.info(`[0.0.2] cutscene: ${id}`);
    this.update(0, this.camera.aspect);
  }

  /** Moves it on by `dt`; ends it after its last frame. `aspect`: the view's. */
  update(dt: number, aspect: number): void {
    const track = this.track;
    if (!track) return;
    this.time = Math.min(track.duration, this.time + Math.max(0, dt));
    const events = track.events;
    while (this.nextEvent < events.length && events[this.nextEvent]!.t <= this.time) this.run(events[this.nextEvent++]!.command);
    if (this.time >= track.duration && dt > 0) return this.finish();
    this.camera.aspect = aspect;
    this.frame(track);
  }

  /** Straight to the end state. */
  skip(): void {
    if (this.track) this.finish();
  }

  private finish(): void {
    const track = this.track!;
    for (const command of track.end) this.run(command);
    this.track = null;
    console.info(`[0.0.2] cutscene ended: ${track.id}`);
    this.onEnded?.(track.id);
  }

  /** The camera as the shot playing now has it. */
  private frame(track: Track): void {
    const shot = [...track.shots].reverse().find((s) => s.start <= this.time) ?? track.shots[0]!;
    const keys = shot.camera;
    const after = keys.findIndex((k) => k.t > this.time);
    const a = keys[after <= 0 ? (after === 0 ? 0 : keys.length - 1) : after - 1]!;
    const b = after <= 0 ? a : keys[after]!;
    const s = b.t > a.t ? (this.time - a.t) / (b.t - a.t) : 0;
    const mix = (i: number) => THREE.MathUtils.lerp(a.at[i]!, b.at[i]!, s);
    const heading = THREE.MathUtils.lerp(a.heading, b.heading, s) * DEG;
    const pitch = THREE.MathUtils.lerp(a.pitch, b.pitch, s) * DEG;
    const at: [number, number, number] = [mix(0), mix(1), mix(2)];
    const ahead: [number, number, number] = [at[0] + Math.cos(pitch) * Math.cos(heading), at[1] + Math.cos(pitch) * Math.sin(heading), at[2] + Math.sin(pitch)];
    this.ship.updateMatrixWorld();
    this.camera.position.copy(this.ship.localToWorld(fromBlender(at)));
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(this.ship.localToWorld(fromBlender(ahead)));
    this.camera.fov = THREE.MathUtils.lerp(a.fov, b.fov, s);
    this.camera.far = shot.far ?? 500;
    this.camera.updateProjectionMatrix();
  }
}
