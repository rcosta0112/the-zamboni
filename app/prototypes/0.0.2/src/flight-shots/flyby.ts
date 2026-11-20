/**
 * The flyby generator's core (plan doc/plans/features/flight-shots.md, pass 1): a seed and ranges make a
 * flyby's values; the values make a cutscene track (cutscene.ts's format); the checks say whether a shot
 * is usable (a failing seed is re-rolled); the buckets describe it, for the repetition warnings.
 *
 * **The ship flies a straight line and the camera orbits it** (owner, 2026-11-20): everything is in the
 * ship's own space, its file's Blender coordinates (the cutscene keys' space): the nose points to -Y, its
 * right side to -X (0400's last frame: "from ahead of its right side"), up +Z, the origin at its belly.
 * The camera turns about the vertical line through the ship's origin (as `tools/flyby-orbit.mjs` did).
 *
 * Plain maths, no three.js: the shot editor, the game and the node checks (`tools/flight-shots-check.mjs`,
 * run with `--experimental-strip-types`) share it. **A saved shot keeps its values**, not only its seed, so
 * a later change to the ranges or the drawing never changes an approved shot.
 */

import type { CameraKey, ShipKey, Track } from '../cutscene';

/** The ship's centre (its bounding box, measured in the game), ship space: what the camera aims at. */
export const SHIP_CENTRE: readonly [number, number, number] = [0.03, 2.66, 3.24];
/** The ship's nose, as a bearing in ship space (degrees from +X toward +Y): -Y. */
export const NOSE_BEARING = -90;

/** Everything a flyby is: what a saved shot stores. Angles in degrees, lengths in metres, times in seconds. */
export interface FlybyValues {
  kind: 'flyby';
  duration: number;
  /** The camera's bearing from the ship's origin (from +X toward +Y, ship space) at the start and the end;
   *  rising: the camera moves to its right (the ship crosses the frame left to right). */
  bearing: [number, number];
  /** Its horizontal distance from the ship's origin at the start and the end (a push in or a pull out). */
  distance: [number, number];
  /** Its height, ship space (the belly at 0, the ground about -14 in flight: `settings.flightHeight`). */
  height: number;
  /** The view turned off the line to the ship's origin (degrees; negative: the ship sits right of the
   *  middle, positive: left). Held all through, as the camera turns with its bearing. */
  yaw: number;
  /** The view tipped off the ship's centre (degrees; positive: the ship sits lower in the frame). */
  pitch: number;
  /** Vertical field of view. */
  fov: number;
  /** Turned about the view (cutscene.ts's `roll`). */
  roll: number;
  /** `even`: the same rate all through (0400); `eased`: it starts and ends slower. */
  pace: 'even' | 'eased';
  /** Seconds into the sway's keys (cutscene 1's) where this shot's sway starts. */
  swayStart: number;
}

/** A [min, max] range. */
export type Range = [number, number];

/** What the generator draws from. */
export interface FlybyRanges {
  duration: Range;
  /** The size of the turn (either way, drawn at random). */
  sweep: Range;
  /** The horizontal distance at the middle. */
  distance: Range;
  /** The push (negative) or pull (positive): the distance's change over the shot, as a share of it. */
  push: Range;
  /** The camera's angle above (or below) the ship's centre, seen from the ship. */
  elevation: Range;
  yaw: Range;
  pitch: Range;
  fov: Range;
  roll: Range;
  /** The share of eased shots (0..1). */
  eased: number;
}

export const FLYBY_RANGES: FlybyRanges = {
  duration: [6, 10],
  sweep: [30, 180],
  distance: [60, 200],
  push: [-0.25, 0.25],
  elevation: [-6, 42],
  yaw: [-14, 14],
  pitch: [-4, 4],
  fov: [22, 50],
  roll: [-4, 4],
  eased: 0.5,
};

/** What the checks need to know about the place. */
export interface FlybyPlace {
  /** The ground's height (ship space) under a point (x, y) at a time; flat at -14 in flight if left out. */
  ground?: (x: number, y: number, t: number) => number;
  /** The picture's width over its height. */
  aspect?: number;
  /** The sway's length (s): `swayStart` drawn within it. */
  swayLength?: number;
}

const DEG = Math.PI / 180;
/** Flat ground in flight: `settings.flightHeight` below the belly. */
const FLAT_GROUND = -14;
const round = (v: number, n = 3) => Math.round(v * 10 ** n) / 10 ** n;
const lerp = (a: number, b: number, s: number) => a + (b - a) * s;

/** A small seeded random (mulberry32): the same seed, the same numbers, on every machine. */
export function random(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A seed's values (unchecked: `generateFlyby` re-rolls the failing ones). */
export function flybyValues(seed: number, ranges: FlybyRanges = FLYBY_RANGES, swayLength = 17.875): FlybyValues {
  const r = random(seed);
  const pick = ([lo, hi]: Range) => lerp(lo, hi, r());
  const duration = pick(ranges.duration);
  const sweep = pick(ranges.sweep) * (r() < 0.5 ? -1 : 1);
  const middle = r() * 360 - 180;
  const distance = pick(ranges.distance);
  const push = pick(ranges.push);
  const elevation = pick(ranges.elevation);
  const yaw = pick(ranges.yaw);
  const pitch = pick(ranges.pitch);
  const fov = pick(ranges.fov);
  const roll = pick(ranges.roll);
  const pace = r() < ranges.eased ? 'eased' : 'even';
  const swayStart = r() * Math.max(0, swayLength - duration);
  return {
    kind: 'flyby',
    duration: round(duration, 2),
    bearing: [round(middle - sweep / 2, 2), round(middle + sweep / 2, 2)],
    distance: [round(distance * (1 - push / 2), 1), round(distance * (1 + push / 2), 1)],
    height: round(SHIP_CENTRE[2] + distance * Math.tan(elevation * DEG), 1),
    yaw: round(yaw, 2),
    pitch: round(pitch, 2),
    fov: round(fov, 1),
    roll: round(roll, 2),
    pace,
    swayStart: round(swayStart, 2),
  };
}

/** The camera at `s` (0..1 through the shot). */
function cameraAt(v: FlybyValues, s: number): Omit<CameraKey, 't'> {
  const e = v.pace === 'eased' ? (1 - Math.cos(Math.PI * s)) / 2 : s;
  const bearing = lerp(v.bearing[0], v.bearing[1], e) * DEG;
  const distance = lerp(v.distance[0], v.distance[1], e);
  const x = distance * Math.cos(bearing);
  const y = distance * Math.sin(bearing);
  // Facing the ship's origin (the bearing turned half a turn), then turned off it by `yaw`.
  const heading = bearing / DEG + 180 + v.yaw;
  // The pitch that puts the ship's centre on the picture's middle line (as flyby-orbit.mjs), then `pitch` off it.
  const ahead = (SHIP_CENTRE[0] - x) * Math.cos(heading * DEG) + (SHIP_CENTRE[1] - y) * Math.sin(heading * DEG);
  const pitch = Math.atan2(SHIP_CENTRE[2] - v.height, ahead) / DEG - v.pitch;
  return { at: [x, y, v.height], heading: normalise(heading), pitch, ...(v.roll ? { roll: v.roll } : {}), fov: v.fov };
}

/** An angle in (-180, 180]. */
function normalise(deg: number): number {
  const a = ((((deg + 180) % 360) + 360) % 360) - 180;
  return a === -180 ? 180 : a;
}

/** The ship's sway for a shot: `sway`'s keys from `start` for `duration` (round again past their end). */
function swayFor(sway: ShipKey[], start: number, duration: number): ShipKey[] {
  if (!sway.length) return [];
  const length = sway[sway.length - 1]!.t;
  const out: ShipKey[] = [];
  for (let lap = 0; out.length === 0 || out[out.length - 1]!.t < duration; lap++) {
    for (const k of sway) {
      const t = k.t + lap * length - start;
      if (lap > 0 && k.t === 0) continue;
      if (t >= -1e-9 && t <= duration + 1e-9 && !(out.length && t <= out[out.length - 1]!.t)) out.push({ ...k, t: round(Math.max(0, t), 4) });
    }
    if (length <= 0 || lap > 20) break;
  }
  return out;
}

export interface TrackOptions {
  id: string;
  /** The ship's sway to cut from (cutscene 1's `ship` keys). */
  sway: ShipKey[];
  /** Camera keys per second (a `smooth` shot: a curve through them). */
  rate?: number;
}

/** The values as a cutscene track: one smooth shot, the ship swaying, her hidden. */
export function flybyTrack(v: FlybyValues, { id, sway, rate = 24 }: TrackOptions): Track {
  const steps = Math.max(1, Math.round(v.duration * rate));
  const camera: CameraKey[] = [];
  for (let i = 0; i <= steps; i++) {
    const c = cameraAt(v, i / steps);
    camera.push({
      t: round((i / steps) * v.duration, 4),
      at: c.at.map((n) => round(n)) as [number, number, number],
      heading: round(c.heading),
      pitch: round(c.pitch),
      ...(c.roll ? { roll: round(c.roll) } : {}),
      fov: round(c.fov, 2),
    });
  }
  const ship = swayFor(sway, v.swayStart, v.duration);
  return {
    id,
    duration: round(v.duration, 4),
    ...(ship.length ? { ship } : {}),
    hide: ['her'],
    events: [],
    end: [],
    shots: [{ start: 0, camera, smooth: true, far: 4000, near: 5, seeThrough: 'off' }],
  };
}

/** Where a point (ship space) falls in the picture, -1..1 each way (outside: beyond), or null behind the camera. */
export function inPicture(c: Omit<CameraKey, 't'>, p: readonly [number, number, number], aspect: number): [number, number] | null {
  const h = c.heading * DEG;
  const pt = c.pitch * DEG;
  const forward = [Math.cos(pt) * Math.cos(h), Math.cos(pt) * Math.sin(h), Math.sin(pt)];
  const right = [Math.sin(h), -Math.cos(h), 0];
  const up = [right[1]! * forward[2]! - right[2]! * forward[1]!, right[2]! * forward[0]! - right[0]! * forward[2]!, right[0]! * forward[1]! - right[1]! * forward[0]!];
  const d = [p[0] - c.at[0], p[1] - c.at[1], p[2] - c.at[2]];
  const dot = (a: number[]) => a[0]! * d[0]! + a[1]! * d[1]! + a[2]! * d[2]!;
  const z = dot(forward);
  if (z <= 0) return null;
  const t = Math.tan((c.fov * DEG) / 2);
  let x = dot(right) / z / (t * aspect);
  let y = dot(up) / z / t;
  // The camera turned by `roll` turns the picture the other way.
  const r = -(c.roll ?? 0) * DEG;
  [x, y] = [x * Math.cos(r) - y * Math.sin(r), x * Math.sin(r) + y * Math.cos(r)];
  return [x, y];
}

/** The checks' limits. */
export const FLYBY_LIMITS = {
  /** The camera at least this far above the ground (m). */
  clearance: 8,
  /** And this far from the ship's centre. */
  nearest: 30,
  /** The ship's centre within this share of the picture's half-width and half-height. */
  inFrame: 0.75,
};

/** What's wrong with a shot (empty: usable). Every key is checked; the line of sight at a few points along it. */
export function checkFlyby(v: FlybyValues, place: FlybyPlace = {}): string[] {
  const ground = place.ground ?? (() => FLAT_GROUND);
  const aspect = place.aspect ?? 16 / 9;
  const problems = new Set<string>();
  const steps = Math.max(8, Math.round(v.duration * 8));
  for (let i = 0; i <= steps; i++) {
    const s = i / steps;
    const t = s * v.duration;
    const c = cameraAt(v, s);
    const [x, y, z] = c.at;
    if (z - ground(x, y, t) < FLYBY_LIMITS.clearance) problems.add('camera too close to the ground');
    const d = Math.hypot(SHIP_CENTRE[0] - x, SHIP_CENTRE[1] - y, SHIP_CENTRE[2] - z);
    if (d < FLYBY_LIMITS.nearest) problems.add('camera too close to the ship');
    const p = inPicture(c, SHIP_CENTRE, aspect);
    if (!p || Math.abs(p[0]) > FLYBY_LIMITS.inFrame || Math.abs(p[1]) > FLYBY_LIMITS.inFrame) problems.add('ship out of frame');
    // The line of sight to the ship's centre above the ground (hills).
    for (let j = 1; j < 10; j++) {
      const f = j / 10;
      const q = [lerp(x, SHIP_CENTRE[0], f), lerp(y, SHIP_CENTRE[1], f), lerp(z, SHIP_CENTRE[2], f)] as const;
      if (q[2] < ground(q[0], q[1], t)) {
        problems.add('ship hidden by the ground');
        break;
      }
    }
  }
  return [...problems];
}

/** The first usable shot from a seed: the seed itself, else re-rolled (seed, then the next numbers from it). */
export function generateFlyby(seed: number, ranges: FlybyRanges = FLYBY_RANGES, place: FlybyPlace = {}, tries = 40): { values: FlybyValues; problems: string[]; rerolls: number } {
  const next = random(seed ^ 0x9e3779b9);
  let values = flybyValues(seed, ranges, place.swayLength);
  let problems = checkFlyby(values, place);
  let rerolls = 0;
  while (problems.length && rerolls < tries) {
    rerolls++;
    values = flybyValues(Math.floor(next() * 2 ** 32), ranges, place.swayLength);
    problems = checkFlyby(values, place);
  }
  return { values, problems, rerolls };
}

/** A shot described in a few words each way: what the repetition warnings and random play compare. */
export interface Buckets {
  /** Which side of the ship the camera mostly sees. */
  side: 'front' | 'right' | 'back' | 'left';
  /** Which way the ship crosses the frame. */
  turn: 'left to right' | 'right to left';
  sweep: 'small' | 'medium' | 'large';
  height: 'below' | 'level' | 'above';
  lens: 'wide' | 'normal' | 'long';
  /** Where the ship sits in the frame. */
  framing: 'left' | 'middle' | 'right';
  /** The camera's view against the sun (none: the sun's bearing wasn't given). */
  sun?: 'into' | 'across' | 'with';
}

/** The angle between two bearings, 0..180. */
const apart = (a: number, b: number) => Math.abs(normalise(a - b));

/** `sunBearing`: where the sun is, a bearing in ship space (the shot's place and heading turn it). */
export function flybyBuckets(v: FlybyValues, sunBearing?: number): Buckets {
  const middle = cameraAt(v, 0.5);
  const bearing = Math.atan2(middle.at[1], middle.at[0]) / DEG;
  const fromNose = normalise(bearing - NOSE_BEARING);
  const side = Math.abs(fromNose) <= 45 ? 'front' : Math.abs(fromNose) >= 135 ? 'back' : fromNose < 0 ? 'right' : 'left';
  const sweep = Math.abs(v.bearing[1] - v.bearing[0]);
  const elevation = Math.atan2(v.height - SHIP_CENTRE[2], (v.distance[0] + v.distance[1]) / 2) / DEG;
  const buckets: Buckets = {
    side,
    turn: v.bearing[1] >= v.bearing[0] ? 'left to right' : 'right to left',
    sweep: sweep < 60 ? 'small' : sweep < 120 ? 'medium' : 'large',
    height: elevation < 0 ? 'below' : elevation < 15 ? 'level' : 'above',
    lens: v.fov > 45 ? 'wide' : v.fov < 28 ? 'long' : 'normal',
    framing: v.yaw < -4 ? 'right' : v.yaw > 4 ? 'left' : 'middle',
  };
  if (sunBearing !== undefined) {
    const off = apart(middle.heading, sunBearing);
    buckets.sun = off < 60 ? 'into' : off > 120 ? 'with' : 'across';
  }
  return buckets;
}

/** The buckets two shots share (the more, the more alike). */
export function shared(a: Buckets, b: Buckets): (keyof Buckets)[] {
  return (Object.keys(a) as (keyof Buckets)[]).filter((k) => a[k] !== undefined && a[k] === b[k]);
}
