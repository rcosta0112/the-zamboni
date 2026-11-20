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
/** The ship's box (its meshes, the gear raised; measured in the shot editor's preview, `ShotPreview.shipBox`),
 *  ship space, min and max: the size on screen and the in-frame check. The nose at -Y. */
export const SHIP_BOX: readonly [readonly [number, number, number], readonly [number, number, number]] = [
  [-5.68, -5.15, 0.69],
  [5.68, 10.48, 6.49],
];
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
  /** The view turned off the line to the ship's origin (degrees; positive: the ship sits right of the
   *  middle, negative: left), at the start and the end (eased between, with the bearing); a single number:
   *  held all through (0400). The generator works it out from a screen position (pass 2b: lead room). */
  yaw: number | [number, number];
  /** The view tipped off the ship's centre (degrees; positive: the ship sits higher in the frame). */
  pitch: number;
  /** Vertical field of view. */
  fov: number;
  /** Turned about the view (cutscene.ts's `roll`). */
  roll: number;
  /** `even`: the same rate all through (0400); `eased`: it starts and ends slower. */
  pace: 'even' | 'eased';
  /** Seconds into the sway's keys (cutscene 1's) where this shot's sway starts. */
  swayStart: number;
  /** The ship's width on screen the generator aimed at, a share of the frame's width at the shot's middle
   *  (pass 2b; information only: the distance makes it). */
  size?: number;
  /** The part of the movement kept (owner, 2026-11-20): seconds into the `duration` the values describe, start
   *  and end; the shot plays only that part, from 0, and is checked and described on it. Left out: the whole. */
  trim?: [number, number];
}

/** The part of a shot's movement played, seconds into its `duration` (the whole if not trimmed). */
export function trimOf(v: FlybyValues): [number, number] {
  if (!v.trim) return [0, v.duration];
  const a = Math.min(Math.max(0, v.trim[0]), v.duration);
  const b = Math.min(Math.max(a, v.trim[1]), v.duration);
  return [a, b];
}

/** The shot's length as played (trimmed). */
export const playedLength = (v: FlybyValues): number => {
  const [a, b] = trimOf(v);
  return b - a;
};

/** The trimmed part as shares (0..1) of the whole movement. */
function trimShares(v: FlybyValues): [number, number] {
  const [a, b] = trimOf(v);
  return v.duration > 0 ? [a / v.duration, b / v.duration] : [0, 1];
}

/** How big the ship is on screen: its width as a share of the frame's width. */
export type SizeClass = 'wide' | 'medium' | 'close';

/** A [min, max] range. */
export type Range = [number, number];

/** What the generator draws from. */
export interface FlybyRanges {
  /** The length (s): fixed, not drawn (owner, 2026-11-20); changed per shot in the editor. */
  duration: number;
  /** The size of the turn (either way, drawn at random). */
  sweep: Range;
  /** The ship's width on screen, a share of the frame's width, per size (the distance follows from it and
   *  the lens), and how likely each size is. */
  size: Record<SizeClass, Range>;
  sizeOdds: Record<SizeClass, number>;
  /** The push (negative) or pull (positive): the distance's change over the shot, as a share of it. */
  push: Range;
  /** The camera's angle above (or below) the ship's centre, seen from the ship. */
  elevation: Range;
  /** Lead room: the ship's centre off the middle, a share of the half-width, on the side behind its travel
   *  as seen on screen (0.33: on a third line). */
  lead: Range;
  /** The ship's centre above (+) or below the middle, a share of the half-height. */
  vertical: Range;
  fov: Range;
  roll: Range;
  /** The share of eased shots (0..1). */
  eased: number;
}

export const FLYBY_RANGES: FlybyRanges = {
  duration: 5,
  sweep: [30, 180],
  size: { wide: [0.05, 0.12], medium: [0.15, 0.3], close: [0.35, 0.6] },
  sizeOdds: { wide: 0.25, medium: 0.5, close: 0.25 },
  push: [-0.25, 0.25],
  elevation: [-6, 42],
  lead: [0.2, 0.45],
  vertical: [-0.15, 0.15],
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

/** Lead room (pass 2b): within this angle of the nose or the tail pointing at (or away from) the camera, the
 *  ship is centred; full lead room past `LEAD_FULL`, eased between. */
const LEAD_NONE = 30;
const LEAD_FULL = 45;
/** The box kept this far (share of the half-width) inside the frame's edge when the lead room moves it. */
const EDGE_MARGIN = 0.05;

/** Where the ship's centre should sit across the frame (-1..1, right +) for the camera at `bearing`: behind its
 *  travel on screen, `lead` off the middle, less for a ship as wide as `size` (kept in frame). */
export function leadAt(bearing: number, lead: number, size: number): number {
  const h = (bearing + 180) * DEG; // facing the ship
  const nose = [Math.cos(NOSE_BEARING * DEG), Math.sin(NOSE_BEARING * DEG)] as const;
  const across = Math.sin(h) * nose[0] - Math.cos(h) * nose[1]; // the travel on screen: + to the right
  const along = Math.cos(h) * nose[0] + Math.sin(h) * nose[1];
  const off = Math.acos(Math.min(1, Math.abs(along))) / DEG; // the nose line against the view line
  const k = Math.min(1, Math.max(0, (off - LEAD_NONE) / (LEAD_FULL - LEAD_NONE)));
  const room = Math.min(lead, Math.max(0, 1 - EDGE_MARGIN - size));
  return -Math.sign(across) * room * k * k * (3 - 2 * k);
}

/** The ship's box on screen: [left, bottom, right, top] (-1..1 each way), or null if a corner is behind the camera. */
export function screenBox(c: Omit<CameraKey, 't'>, aspect: number): [number, number, number, number] | null {
  const out: [number, number, number, number] = [Infinity, Infinity, -Infinity, -Infinity];
  for (let i = 0; i < 8; i++) {
    const p = inPicture(c, [SHIP_BOX[i & 1]![0], SHIP_BOX[(i >> 1) & 1]![1], SHIP_BOX[(i >> 2) & 1]![2]], aspect);
    if (!p) return null;
    out[0] = Math.min(out[0], p[0]);
    out[1] = Math.min(out[1], p[1]);
    out[2] = Math.max(out[2], p[0]);
    out[3] = Math.max(out[3], p[1]);
  }
  return out;
}

/** The ship's width on screen (share of the frame's width) for a camera; Infinity if part of it is behind. */
export function sizeOnScreen(c: Omit<CameraKey, 't'>, aspect: number): number {
  const b = screenBox(c, aspect);
  return b ? (b[2] - b[0]) / 2 : Infinity;
}

/** A seed's values (unchecked: `generateFlyby` re-rolls the failing ones). Pass 2b: the ship's place in the
 *  frame and its size on screen are drawn, and the view's turn and the distance worked out from them. */
export function flybyValues(seed: number, ranges: FlybyRanges = FLYBY_RANGES, swayLength = 17.875, aspect = 16 / 9): FlybyValues {
  const r = random(seed);
  const pick = ([lo, hi]: Range) => lerp(lo, hi, r());
  const duration = ranges.duration;
  r(); // the draw the length once took: kept so every seed's other values stay as they were
  const sweep = pick(ranges.sweep) * (r() < 0.5 ? -1 : 1);
  const middle = r() * 360 - 180;
  const push = pick(ranges.push);
  const elevation = pick(ranges.elevation);
  const fov = pick(ranges.fov);
  let odds = r();
  const classes = Object.keys(ranges.sizeOdds) as SizeClass[];
  const sizeClass = classes.find((k, i) => (odds -= ranges.sizeOdds[k]) < 0 || i === classes.length - 1)!;
  const size = pick(ranges.size[sizeClass]);
  const lead = pick(ranges.lead);
  const vertical = pick(ranges.vertical);
  const roll = pick(ranges.roll);
  const pace = r() < ranges.eased ? 'eased' : 'even';
  const swayStart = r() * Math.max(0, swayLength - duration);
  const bearing: [number, number] = [round(middle - sweep / 2, 2), round(middle + sweep / 2, 2)];
  const values: FlybyValues = {
    kind: 'flyby',
    duration: round(duration, 2),
    bearing,
    distance: [0, 0],
    height: 0,
    yaw: 0,
    pitch: 0,
    fov: 0,
    roll: round(roll, 2),
    pace,
    swayStart: round(swayStart, 2),
    size: round(size, 3),
  };
  let distance = frame(values, fov, { push, elevation, lead, vertical, aspect });
  // Too near for the lens (a close shot on a wide lens): the lens narrowed until the camera is far enough.
  if (distance < MIN_DISTANCE && fov > ranges.fov[0]) {
    const narrower = (2 * Math.atan((Math.tan((fov * DEG) / 2) * distance) / MIN_DISTANCE)) / DEG;
    distance = frame(values, Math.max(ranges.fov[0], narrower), { push, elevation, lead, vertical, aspect });
  }
  return values;
}

/** The camera's distance (m) from the ship's origin the generator aims for at least (the checks' `nearest`
 *  is measured from the centre). */
const MIN_DISTANCE = 40;

/** Fills in the values' lens, view and distance from where the ship should sit and its size (pass 2b): the
 *  screen position as angles (across with the horizontal field of view, up with the vertical), the distance
 *  measured at the shot's middle and scaled until the size is right (it goes about as 1 / distance). */
function frame(v: FlybyValues, fov: number, o: { push: number; elevation: number; lead: number; vertical: number; aspect: number }): number {
  const tanV = Math.tan((fov * DEG) / 2);
  const size = v.size!;
  v.fov = round(fov, 1);
  v.yaw = v.bearing.map((b) => round(Math.atan(leadAt(b, o.lead, size) * tanV * o.aspect) / DEG, 2)) as [number, number];
  v.pitch = round(Math.atan(o.vertical * tanV) / DEG, 2);
  let distance = 100;
  for (let i = 0; i < 6; i++) {
    v.distance = [distance * (1 - o.push / 2), distance * (1 + o.push / 2)];
    v.height = SHIP_CENTRE[2] + distance * Math.tan(o.elevation * DEG);
    const now = sizeOnScreen(cameraAt(v, 0.5), o.aspect);
    if (!Number.isFinite(now)) break;
    distance *= now / size;
  }
  v.distance = [round(distance * (1 - o.push / 2), 1), round(distance * (1 + o.push / 2), 1)];
  v.height = round(SHIP_CENTRE[2] + distance * Math.tan(o.elevation * DEG), 1);
  return distance;
}

/** The camera's bearing (unwrapped) at `s` (0..1 through the whole movement). */
function bearingAt(v: FlybyValues, s: number): number {
  const e = v.pace === 'eased' ? (1 - Math.cos(Math.PI * s)) / 2 : s;
  return lerp(v.bearing[0], v.bearing[1], e);
}

/** The view's turn off the ship at `e` (0..1, eased). */
const yawAt = (v: FlybyValues, e: number) => (typeof v.yaw === 'number' ? v.yaw : lerp(v.yaw[0], v.yaw[1], e));

/** The camera at `s` (0..1 through the shot): the editor's guides. */
export const flybyCamera = (v: FlybyValues, s: number) => cameraAt(v, s);

/** The camera at `s` (0..1 through the shot). */
function cameraAt(v: FlybyValues, s: number): Omit<CameraKey, 't'> {
  const e = v.pace === 'eased' ? (1 - Math.cos(Math.PI * s)) / 2 : s;
  const bearing = lerp(v.bearing[0], v.bearing[1], e) * DEG;
  const distance = lerp(v.distance[0], v.distance[1], e);
  const x = distance * Math.cos(bearing);
  const y = distance * Math.sin(bearing);
  // Facing the ship's origin (the bearing turned half a turn), then turned off it by `yaw`.
  const heading = bearing / DEG + 180 + yawAt(v, e);
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
  /** The whole movement, the trim ignored (the editor's preview, to show what's cut). */
  whole?: boolean;
}

/** The values as a cutscene track: one smooth shot, the ship swaying, her hidden. Trimmed: only the part kept,
 *  from 0 (the sway from the same moment). */
export function flybyTrack(v: FlybyValues, { id, sway, rate = 24, whole = false }: TrackOptions): Track {
  const [a, b] = whole ? [0, v.duration] : trimOf(v);
  const [s0, s1] = whole ? [0, 1] : trimShares(v);
  const length = b - a;
  const steps = Math.max(1, Math.round(length * rate));
  const camera: CameraKey[] = [];
  let heading = 0;
  for (let i = 0; i <= steps; i++) {
    const c = cameraAt(v, s0 + (s1 - s0) * (i / steps));
    // Unwrapped: the keys are blended as plain numbers, so 179.8 then -179.7 would spin the camera the long way
    // round (seed 21200 at 6.8 s); each heading kept within half a turn of the one before.
    heading = i === 0 ? c.heading : heading + normalise(c.heading - heading);
    camera.push({
      t: round((i / steps) * length, 4),
      at: c.at.map((n) => round(n)) as [number, number, number],
      heading: round(heading),
      pitch: round(c.pitch),
      ...(c.roll ? { roll: round(c.roll) } : {}),
      fov: round(c.fov, 2),
    });
  }
  const ship = swayFor(sway, v.swayStart + a, length);
  return {
    id,
    duration: round(length, 4),
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
  /** Its whole box within this share (pass 2b: the nose not cut). */
  boxInFrame: 0.98,
};

/** What's wrong with a shot (empty: usable). Every key is checked; the line of sight at a few points along it. */
export function checkFlyby(v: FlybyValues, place: FlybyPlace = {}): string[] {
  const ground = place.ground ?? (() => FLAT_GROUND);
  const aspect = place.aspect ?? 16 / 9;
  const problems = new Set<string>();
  const [s0, s1] = trimShares(v);
  const steps = Math.max(8, Math.round(playedLength(v) * 8));
  for (let i = 0; i <= steps; i++) {
    const s = s0 + (s1 - s0) * (i / steps);
    const t = (i / steps) * playedLength(v);
    const c = cameraAt(v, s);
    const [x, y, z] = c.at;
    if (z - ground(x, y, t) < FLYBY_LIMITS.clearance) problems.add('camera too close to the ground');
    const d = Math.hypot(SHIP_CENTRE[0] - x, SHIP_CENTRE[1] - y, SHIP_CENTRE[2] - z);
    if (d < FLYBY_LIMITS.nearest) problems.add('camera too close to the ship');
    const p = inPicture(c, SHIP_CENTRE, aspect);
    if (!p || Math.abs(p[0]) > FLYBY_LIMITS.inFrame || Math.abs(p[1]) > FLYBY_LIMITS.inFrame) problems.add('ship out of frame');
    else {
      const b = screenBox(c, aspect);
      const m = FLYBY_LIMITS.boxInFrame;
      if (!b || b[0] < -m || b[1] < -m || b[2] > m || b[3] > m) problems.add('ship cut by the frame’s edge');
    }
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
  let values = flybyValues(seed, ranges, place.swayLength, place.aspect);
  let problems = checkFlyby(values, place);
  let rerolls = 0;
  while (problems.length && rerolls < tries) {
    rerolls++;
    values = flybyValues(Math.floor(next() * 2 ** 32), ranges, place.swayLength, place.aspect);
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
  /** The perspective (the field of view); the size on screen is `size`. */
  lens: 'wide' | 'normal' | 'long';
  /** The ship's width on screen at the middle (pass 2b). */
  size: SizeClass;
  /** Where the ship sits in the frame at the middle. */
  framing: 'left' | 'middle' | 'right';
  /** The camera's view against the sun (none: the sun's bearing wasn't given). */
  sun?: 'into' | 'across' | 'with';
}

/** The angle between two bearings, 0..180. */
const apart = (a: number, b: number) => Math.abs(normalise(a - b));

/** `sunBearing`: where the sun is, a bearing in ship space (the shot's place and heading turn it). */
export function flybyBuckets(v: FlybyValues, sunBearing?: number, aspect = 16 / 9): Buckets {
  // On the part played (trimmed: its middle, its own turn).
  const [s0, s1] = trimShares(v);
  const middle = cameraAt(v, (s0 + s1) / 2);
  const bearing = Math.atan2(middle.at[1], middle.at[0]) / DEG;
  const fromNose = normalise(bearing - NOSE_BEARING);
  const side = Math.abs(fromNose) <= 45 ? 'front' : Math.abs(fromNose) >= 135 ? 'back' : fromNose < 0 ? 'right' : 'left';
  const [from, to] = [bearingAt(v, s0), bearingAt(v, s1)];
  const sweep = Math.abs(to - from);
  const elevation = Math.atan2(v.height - SHIP_CENTRE[2], (v.distance[0] + v.distance[1]) / 2) / DEG;
  const buckets: Buckets = {
    side,
    turn: to >= from ? 'left to right' : 'right to left',
    sweep: sweep < 60 ? 'small' : sweep < 120 ? 'medium' : 'large',
    height: elevation < 0 ? 'below' : elevation < 15 ? 'level' : 'above',
    lens: v.fov > 45 ? 'wide' : v.fov < 28 ? 'long' : 'normal',
    size: sizeClass(sizeOnScreen(middle, aspect)),
    framing: framingOf(inPicture(middle, SHIP_CENTRE, aspect)?.[0] ?? 0),
  };
  if (sunBearing !== undefined) {
    const off = apart(middle.heading, sunBearing);
    buckets.sun = off < 60 ? 'into' : off > 120 ? 'with' : 'across';
  }
  return buckets;
}

/** A size on screen as a class (the ranges' gaps split in the middle). */
export const sizeClass = (share: number): SizeClass => (share < 0.135 ? 'wide' : share < 0.325 ? 'medium' : 'close');
const framingOf = (x: number): Buckets['framing'] => (x < -0.15 ? 'left' : x > 0.15 ? 'right' : 'middle');

/** The buckets two shots share (the more, the more alike). */
export function shared(a: Buckets, b: Buckets): (keyof Buckets)[] {
  return (Object.keys(a) as (keyof Buckets)[]).filter((k) => a[k] !== undefined && a[k] === b[k]);
}
