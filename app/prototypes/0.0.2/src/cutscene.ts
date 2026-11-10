// In-engine cutscenes: a track (the game's in `public/cutscenes/<id>.json`, the checks' in
// `public/test/cutscenes/`) of shots, each a camera's keys, the ship's own movement (its sway: the
// ship object moved while it plays, put back at its end), an event track of commands (commands.ts) at
// their times, and the end state, the commands that leave the world as the cutscene ends. The player draws through its own camera, so the game's camera keeps
// its place behind her and the hand-back is that camera again. While it plays she stands still, nothing
// can be used and the see-through is off (main.ts: the camera is authored). *Skip* jumps to the end
// state: the events not yet run are left out, the end state covers them. The test one,
// `test-ship-shots`, is written by `tools/test-cutscene.mjs`; cutscene 1 by `tools/flyby-cutscene.py`
// from the owner's fly-by file. Dev builds: `__cutscene().play('<id>')`, `skip()`.
// Plan: doc/plans/architecture/game-architecture/game-structure.md (*Cutscenes*, pass 5)

import * as THREE from 'three/webgpu';
import type { CloudTrack } from './clouds';
import { fromBlender, type Command } from './commands';
import { SWAY_DEG, WAVES } from './watched';

/** A camera key: where it is and which way it looks, in the ship file's Blender coordinates. */
export interface CameraKey {
  /** Seconds from the cutscene's start. */
  t: number;
  at: [number, number, number];
  /** Degrees about Blender's Z, from +X toward +Y (as Blender turns an object); lower turns right. */
  heading: number;
  /** Degrees up from level. */
  pitch: number;
  /** Degrees turned about the view (the image turns the other way); 0 if left out. */
  roll?: number;
  /** Vertical field of view, degrees. */
  fov: number;
}

export interface Shot {
  /** Seconds from the cutscene's start; it lasts until the next shot's start, or the end. */
  start: number;
  /** Two keys or more, eased linearly between (one holds still), or on a curve with `smooth`. */
  camera: CameraKey[];
  /** A curve through the keys (Catmull-Rom) instead of straight lines: for a baked camera, keyed every
   *  frame, whose corners at each key showed as judder. */
  smooth?: boolean;
  /** The camera's far plane (m): a far-off shot needs more than the game's. */
  far?: number;
  /** Its near plane (m; 0.1 if left out): further for a shot with nothing close, so the depth is finer
   *  far off (the scenery's flattened shadows flicker on the ice without it). */
  near?: number;
  /** Only `off` for now; later `her` or another target's id (plan, *Cutscenes*). */
  seeThrough: 'off';
  /** A hand-held drift on the camera, cutscene 2's (watched.ts), at this strength (none if left out). */
  handheld?: number;
}

/** The ship's flight as a cutscene keys it, eased linearly between keys (the landing: it comes down
 *  flying, though the landed scene has already set it landed). While a track has these, they stand in
 *  for `settings.shipFlying`'s gear, flames and engine noise. */
export interface FlightKey {
  t: number;
  /** The landing gear raised: 0 down, 1 all the way up (`settings.landingGearUp`). */
  gear: number;
  /** The thrusters' flames, times their strength (0: off). */
  flames: number;
  /** The engine noise, 0..1. */
  noise: number;
  /** Degrees the back and front turbines are turned down (none: at rest). */
  turbines?: [number, number];
  /** The front pair's share of the flames' strength (none: 1). */
  front?: number;
  /** The flames' length, times the file's (none: 1; shortened near the ground). */
  reach?: number;
  /** The painted bloom per nozzle, times its level (none: 0). */
  glow?: number;
  /** 1 once the gear stands on the ground: it stays there while the `ship` keys rock the hull on it
   *  (`gearHold`; none: 0). Keyed 1 only from the touchdown, where the ship's keys are at rest. */
  planted?: number;
}

/** The ship's pose off its own, in its file's Blender coordinates. */
export interface ShipKey {
  t: number;
  /** Metres. */
  offset: [number, number, number];
  /** Degrees about Blender's X (its pitch) then Y (its roll). */
  tilt: [number, number];
}

export interface Track {
  id: string;
  /** Seconds. */
  duration: number;
  shots: Shot[];
  /** The ship's sway, on a curve through its keys (as a `smooth` shot); none: it stays as it is. */
  ship?: ShipKey[];
  /** The gear, flames and engine noise over time; none: as `settings.shipFlying` has them. */
  flight?: FlightKey[];
  /** Clouds on the ground round the ship (the landing; clouds.ts draws them); none: no clouds. */
  clouds?: CloudTrack;
  /** The scenery's speed while it plays, times the terrain's (1 if left out). */
  speed?: number;
  /** Hidden while it plays: `her` (she isn't the ship's child, so she wouldn't sway with it). */
  hide?: 'her'[];
  /** Commands at their times. */
  events: { t: number; command: Command }[];
  /** How it leaves the world: run at its end, and by *skip*. */
  end: Command[];
}

/** Cutscene 1's camera from the ship at its start and its end (m): the distances `heardNear` maps to 0 and 1. */
const HEARD_FAR = 197;
const HEARD_NEAR = 120;

const DEG = Math.PI / 180;
const X_AXIS = new THREE.Vector3(1, 0, 0);
/** Blender's Y in the ship's own space (`fromBlender`). */
const Y_AXIS = new THREE.Vector3(0, 0, -1);

/** The two keys round `time` and how far between them (one key, or past the ends: that one, held). */
function around<K extends { t: number }>(keys: K[], time: number): [K, K, number] {
  const after = keys.findIndex((k) => k.t > time);
  const a = keys[after <= 0 ? (after === 0 ? 0 : keys.length - 1) : after - 1]!;
  const b = after <= 0 ? a : keys[after]!;
  return [a, b, b.t > a.t ? (time - a.t) / (b.t - a.t) : 0];
}

/** A value at `time` on a curve through the keys (Catmull-Rom, evenly keyed; past the ends, the end
 *  key's), or eased linearly between the two round it. */
function sample<K extends { t: number }>(keys: K[], time: number, value: (k: K) => number, smooth = true): number {
  const [a, b, s] = around(keys, time);
  if (!smooth || a === b) return THREE.MathUtils.lerp(value(a), value(b), s);
  const i = keys.indexOf(a);
  const [v0, v1, v2, v3] = [keys[Math.max(0, i - 1)]!, a, b, keys[Math.min(keys.length - 1, i + 2)]!].map(value) as [number, number, number, number];
  return 0.5 * (2 * v1 + (v2 - v0) * s + (2 * v0 - 5 * v1 + 4 * v2 - v3) * s * s + (3 * v1 - v0 - 3 * v2 + v3) * s * s * s);
}

export class CutscenePlayer {
  /** What the cutscene shows through; main.ts renders with it while one plays. */
  readonly camera = new THREE.PerspectiveCamera(55, 1, 0.1, 500);
  /** The track playing, or null. */
  track: Track | null = null;
  /** Seconds into it. */
  time = 0;
  /** Called once a cutscene has ended (played out or skipped): the checkpoint (main.ts). */
  onEnded: ((id: string) => void) | null = null;
  private nextEvent = 0;
  /** The tracks fetched so far, by id. */
  private readonly loaded = new Map<string, Track>();
  /** The ship's own place while one plays: the camera's keys are from it, and it goes back there. */
  private readonly rest = new THREE.Object3D();
  private readonly tilt = new THREE.Quaternion();
  /** The followers' own matrices, and the sway as a matrix (the ship's now, against its own). */
  private readonly followersRest: THREE.Matrix4[];
  private readonly sway = new THREE.Matrix4();
  /** The ship's move off its own place, in its own space (offset and tilt), and its inverse. */
  private readonly moved = new THREE.Matrix4();
  private readonly hold = new THREE.Matrix4();

  constructor(
    /** The ship's object: the keys are in its file's coordinates. */
    private readonly ship: THREE.Object3D,
    private readonly run: (command: Command) => void,
    /** Moved as the ship sways: its merged shadow casters, in world space, not its children. */
    private readonly followers: THREE.Object3D[] = [],
  ) {
    this.followersRest = followers.map(() => new THREE.Matrix4());
  }

  get playing(): boolean {
    return this.track !== null;
  }

  /** The ship's own place while one plays (what its keys and the clouds' places are from). */
  get restFrame(): THREE.Object3D {
    return this.rest;
  }

  /** The flight as the track keys it now (main.ts hands it to the gear, the flames and the noise), or null. */
  get flight(): Omit<FlightKey, 't'> | null {
    const keys = this.track?.flight;
    if (!keys?.length) return null;
    const at = (get: (k: FlightKey) => number) => sample(keys, this.time, get, false);
    const turbines: [number, number] | undefined = keys[0]!.turbines ? [at((k) => k.turbines?.[0] ?? 0), at((k) => k.turbines?.[1] ?? 0)] : undefined;
    return { gear: at((k) => k.gear), flames: at((k) => k.flames), noise: at((k) => k.noise), turbines, front: at((k) => k.front ?? 1), reach: at((k) => k.reach ?? 1), glow: at((k) => k.glow ?? 0) };
  }

  /** The ship's move undone, in its own space, while the gear is planted (main.ts → `Ship.gearHold`), or null. */
  get gearHold(): THREE.Matrix4 | null {
    const keys = this.track?.flight;
    if (!this.track?.ship || !keys?.length || sample(keys, this.time, (k) => k.planted ?? 0, false) < 0.999) return null;
    return this.hold.copy(this.moved).invert();
  }

  /** 0..1: how far the shot playing has zoomed in, from its first key's lens to its narrowest (the sound's mix: main.ts). */
  get zoomed(): number {
    const track = this.track;
    if (!track) return 0;
    const shot = [...track.shots].reverse().find((s) => s.start <= this.time) ?? track.shots[0]!;
    const first = shot.camera[0]!.fov;
    const narrowest = Math.min(...shot.camera.map((k) => k.fov));
    return first > narrowest ? THREE.MathUtils.clamp((first - this.camera.fov) / (first - narrowest), 0, 1) : 0;
  }

  /**
   * 0..1: how close the shot playing sounds, for the mix of the ship's noise and the wind (main.ts):
   * `zoomed` for a shot whose lens zooms (cutscene 1); otherwise from the camera's distance to the ship,
   * on cutscene 1's scale (owner, 2026-11-06: cutscene 2's exterior shot, a fixed lens, mixed as the
   * distances in cutscene 1): its camera starts HEARD_FAR from the ship (0) and ends HEARD_NEAR (1).
   */
  get heardNear(): number {
    const track = this.track;
    if (!track) return 0;
    const shot = [...track.shots].reverse().find((s) => s.start <= this.time) ?? track.shots[0]!;
    if (shot.camera.some((k) => k.fov !== shot.camera[0]!.fov)) return this.zoomed;
    const distance = this.camera.position.distanceTo(this.rest.position);
    return THREE.MathUtils.clamp((HEARD_FAR - distance) / (HEARD_FAR - HEARD_NEAR), 0, 1);
  }

  /** Fetches a track (once), so a later `play` starts it at once: main.ts loads the animatic's with the game. */
  async load(id: string): Promise<Track> {
    const known = this.loaded.get(id);
    if (known) return known;
    // The game's first, then the checks' (a missing file comes back as the page: not JSON).
    let response: Response | null = null;
    for (const folder of ['/cutscenes', '/test/cutscenes']) {
      const r = await fetch(`${folder}/${id}.json`);
      if (r.ok && r.headers.get('content-type')?.includes('json')) {
        response = r;
        break;
      }
    }
    if (!response) throw new Error(`no cutscene "${id}"`);
    const track = (await response.json()) as Track;
    track.events.sort((a, b) => a.t - b.t);
    this.loaded.set(id, track);
    return track;
  }

  /** Starts it; on this frame if it was loaded (no frame of the game's camera before it). */
  async play(id: string): Promise<void> {
    const track = this.loaded.get(id) ?? (await this.load(id));
    if (this.track) this.putBack();
    this.rest.position.copy(this.ship.position);
    this.rest.quaternion.copy(this.ship.quaternion);
    this.rest.scale.copy(this.ship.scale);
    this.rest.updateMatrixWorld();
    this.followers.forEach((f, i) => this.followersRest[i]!.compose(f.position, f.quaternion, f.scale));
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
    this.putBack();
    this.track = null;
    console.info(`[0.0.2] cutscene ended: ${track.id}`);
    this.onEnded?.(track.id);
  }

  /** Whether `her` is hidden by the cutscene playing. */
  hides(what: 'her'): boolean {
    return this.track?.hide?.includes(what) ?? false;
  }

  /** The ship back where it was before the cutscene swayed it. */
  private putBack(): void {
    if (!this.track?.ship) return;
    this.ship.position.copy(this.rest.position);
    this.ship.quaternion.copy(this.rest.quaternion);
    this.followers.forEach((f, i) => this.followersRest[i]!.decompose(f.position, f.quaternion, f.scale));
  }

  /** The camera as the shot playing now has it; the ship as the track sways it. */
  private frame(track: Track): void {
    if (track.ship?.length) {
      const keys = track.ship;
      const offset = fromBlender([0, 1, 2].map((i) => sample(keys, this.time, (k) => k.offset[i]!)) as [number, number, number]);
      // Blender's XYZ order: X first, then Y.
      this.tilt.setFromAxisAngle(Y_AXIS, sample(keys, this.time, (k) => k.tilt[1]) * DEG).multiply(new THREE.Quaternion().setFromAxisAngle(X_AXIS, sample(keys, this.time, (k) => k.tilt[0]) * DEG));
      this.ship.position.copy(this.rest.localToWorld(offset));
      this.ship.quaternion.copy(this.rest.quaternion).multiply(this.tilt);
      // Its shadows with it: the casters by the same move.
      this.ship.updateMatrix();
      this.moved.copy(this.rest.matrix).invert().multiply(this.ship.matrix);
      this.sway.copy(this.rest.matrix).invert().premultiply(this.ship.matrix);
      this.followers.forEach((f, i) => this.sway.clone().multiply(this.followersRest[i]!).decompose(f.position, f.quaternion, f.scale));
    }
    const shot = [...track.shots].reverse().find((s) => s.start <= this.time) ?? track.shots[0]!;
    const value = (get: (k: CameraKey) => number) => sample(shot.camera, this.time, get, shot.smooth);
    const mix = (i: number) => value((k) => k.at[i]!);
    const heading = value((k) => k.heading) * DEG;
    const pitch = value((k) => k.pitch) * DEG;
    const at: [number, number, number] = [mix(0), mix(1), mix(2)];
    const ahead: [number, number, number] = [at[0] + Math.cos(pitch) * Math.cos(heading), at[1] + Math.cos(pitch) * Math.sin(heading), at[2] + Math.sin(pitch)];
    // From the ship's own place: a swaying ship doesn't sway the camera.
    const frame = track.ship ? this.rest : this.ship;
    this.ship.updateMatrixWorld();
    this.camera.position.copy(frame.localToWorld(fromBlender(at)));
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(frame.localToWorld(fromBlender(ahead)));
    this.camera.rotateZ(value((k) => k.roll ?? 0) * DEG);
    if (shot.handheld) {
      // Cutscene 2's drift, on the camera's own axes (the time is the track's, so a replay is the same).
      const angle = (axis: keyof typeof SWAY_DEG) =>
        SWAY_DEG[axis] * shot.handheld! * DEG * WAVES[axis].reduce((sum, [hz, share, phase]) => sum + share * Math.sin(2 * Math.PI * hz * this.time + phase), 0);
      this.camera.quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(angle('pitch'), angle('yaw'), angle('roll'), 'YXZ')));
    }
    this.camera.fov = value((k) => k.fov);
    this.camera.far = shot.far ?? 500;
    this.camera.near = shot.near ?? 0.1;
    this.camera.updateProjectionMatrix();
  }
}
