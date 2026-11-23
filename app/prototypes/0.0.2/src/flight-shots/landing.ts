/**
 * The landing's shots (plan doc/plans/features/landing-takeoff-shots.md, pass 1): the ship's motion is fixed
 * (0600's, moved here from `tools/landing-cutscene.mjs`: the descent, drift, sway, gear, turbines, the rocking
 * on the gear, the clouds on the ground); the **camera** and the **engines' power** are the shot's values.
 * A seed draws the camera (only the *tripod operator* for now: 0600's, aiming a little late); the values make
 * a cutscene track (cutscene.ts's format), as flyby.ts does for flybys. The saved shot `0600` is the landing
 * the game plays (cutscene.ts `FROM_SHOTS`), key for key the old `landing.json` (`tools/flight-shots-check.mjs`).
 *
 * **The engines' power** (owner, 2026-11-21): one curve, the track's `flames` key: it brightens and lengthens
 * the flames, widens their core and bloom, quickens their flicker (flames.ts) and raises the engine noise's
 * pitch (audio.ts). High in the last seconds before touchdown, off at it.
 *
 * Plain maths, no three.js, type imports only (the node checks run it with `--experimental-strip-types`).
 * Places in the ship's Blender axes from its landed origin (its gear's feet): −Y the nose, +X its left, +Z up.
 */

import type { CameraKey, FlightKey, ShipKey, Track } from '../cutscene';
import type { CloudTrack } from '../clouds';

// --- The motion's timing (s) ---
/** Lengthened for the turbines turning back after touchdown (owner, 2026-11-10). */
export const LANDING_DURATION = 16;
/** The gear's feet touch the ground. */
export const TOUCHDOWN = 9.5;
/** The gear comes down between these. */
export const GEAR: readonly [number, number] = [4, 7.5];

// --- The descent ---
/** Metres above the landed place at the start. */
const HEIGHT = 20;
/** Metres behind the landed place at the start (it drifts forward as it comes down). */
const DRIFT = 4;
/** The descent's ease: the height left is HEIGHT × (1 − u)^EASE (u: 0 → 1 to touchdown); 2: braking evenly. */
const EASE = 1.6;
/** The hover's sway (degrees), fading out by touchdown; and the nose up while it brakes its drift. */
const SWAY = 1.0;
const NOSE_UP = 2.5;

// --- The rocking on the gear (owner, 2026-11-10): on touchdown the ship dips and tips nose down, springing
// back in a few fading rocks (a damped spring). Heavier (owner): tip and roll ×0.6, each swing 0.33 of the last. ---
const ROCK_DIP = 0.09;
const ROCK_TIP = 0.9;
const ROCK_ROLL = 0.24;
const ROCK_HZ = 1.3;
const ROCK_FADE = 2.86;
/** The ship keys' spacing (s): fine enough for the rocks. */
const SHIP_STEP = 0.05;

/** The engine noise: on, faded out after touchdown. */
const NOISE: [number, number][] = [[0, 1], [TOUCHDOWN, 1], [TOUCHDOWN + 1.5, 0]];

// --- The turbines (owner, 2026-11-10): down from the shot's start, balancing the ship ---
const BACK_DOWN = 90;
/** The front pair: past straight down, its flames down and forward; correcting as it rocks. */
const FRONT_DOWN = 115;
const FRONT_CORRECTS = -5;
/** The front pair's share of the flames' strength (smaller flames). */
const FRONT_FLAMES = 0.6;
/** After touchdown, once the engines are off, they turn back slowly (owner): between these (s). */
const TURN_BACK: readonly [number, number] = [11, 15];
/** The flames' length near the ground: the back pair's cones (7.6 m) end about CLEARANCE over the ice. */
const NOZZLE_HEIGHT = 3.5;
const BACK_CONE = 7.58;
const CLEARANCE = 0.3;
/** The painted bloom's level (it flares with the power in the game). */
const GLOW = 1;
/** The point aimed at on the ship, from its origin (its gear's feet): about the hull's middle. */
export const SHIP_MIDDLE: readonly [number, number, number] = [0, 0, 2.6];

/** A power curve: [seconds, level] keys, eased linearly; 1 is a flight's usual, 0 off. */
export type PowerKeys = [number, number][];

/** 0600's power (owner, 2026-11-10: the flames flare as it brakes), off just after touchdown. */
export const LANDING_POWER: PowerKeys = [[0, 0.7], [3, 0.8], [6.5, 1.5], [9.2, 1.7], [9.9, 0]];

/** The tripod operator (0600's): a camera standing on the ground, aiming at the ship a little late. */
export interface TripodCamera {
  type: 'tripod';
  /** Seconds into the movement it starts (the first: 0). */
  start: number;
  /** From the ship's landed origin: metres off, degrees round from its right side toward its nose (negative:
   *  toward its tail; past 90: the other side), metres up (`follow`: the share of the ship's height it rises with). */
  distance: number;
  round: number;
  height: number;
  follow: number;
  /** Vertical field of view (degrees). */
  fov: number;
  /** The aim off the ship (degrees): left of it (negative: the ship sits right of centre), under it. */
  aimLeft: number;
  aimUnder: number;
  /** The operator's lag (s): aims where the ship was this long ago. */
  lag: number;
  /** A hand-held drift (cutscene 2's), its strength; 0: none. */
  handheld: number;
}

/** Everything a landing is: what a saved shot stores. */
export interface LandingValues {
  kind: 'landing';
  /** The movement's length (s): the motion's, fixed. */
  duration: number;
  /** The camera shots, in order (pass 1: one tripod). */
  cameras: TripodCamera[];
  /** The engines' power over the movement. */
  power: PowerKeys;
  /** The part played: start and end, seconds into the movement (left out: the whole). */
  trim?: [number, number];
}

/** The ranges a seed draws from (the tripod; pass 2 adds the other camera types and the cuts). */
export const LANDING_RANGES = {
  distance: [16, 60] as [number, number],
  /** Degrees round from the side, either side of the ship (the sign picks the side by `side`). */
  round: [10, 75] as [number, number],
  height: [0.1, 3] as [number, number],
  fov: [22, 45] as [number, number],
  /** Where the ship sits across (share of the half-width, its nose's side), and up. */
  across: [0.05, 0.35] as [number, number],
  vertical: [-0.1, 0.15] as [number, number],
  lag: [0.2, 0.5] as [number, number],
  handheld: [1.2, 2.4] as [number, number],
};

const DEG = Math.PI / 180;
const round = (v: number, d = 3) => Math.round(v * 10 ** d) / 10 ** d;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (a: number, b: number, t: number) => {
  const u = clamp01((t - a) / (b - a));
  return u * u * (3 - 2 * u);
};
/** Linear through [time, value] keys, held past the ends. */
export function lerpKeys(p: readonly (readonly [number, number])[], t: number): number {
  if (!p.length) return 0;
  if (t <= p[0]![0]) return p[0]![1];
  for (let i = 1; i < p.length; i++) if (t <= p[i]![0]) return p[i - 1]![1] + ((p[i]![1] - p[i - 1]![1]) * (t - p[i - 1]![0])) / (p[i]![0] - p[i - 1]![0]);
  return p[p.length - 1]![1];
}

/** The ship's offset (m) and tilt (degrees: pitch, positive nose down; roll) at `t`. */
export function shipAt(t: number): { offset: [number, number, number]; tilt: [number, number] } {
  const u = clamp01(t / TOUCHDOWN);
  const left = (1 - u) ** EASE;
  const fade = Math.sqrt(1 - u);
  const braking = (1 - u) ** (EASE - 1);
  const tt = Math.min(t, TOUCHDOWN);
  const sway = (hz1: number, hz2: number, p: number) => SWAY * fade * (0.6 * Math.sin(2 * Math.PI * hz1 * tt + p) + 0.4 * Math.sin(2 * Math.PI * hz2 * tt + 2 * p));
  const r = Math.max(0, t - TOUCHDOWN);
  const w = 2 * Math.PI * ROCK_HZ;
  const peak = Math.exp(-ROCK_FADE / (4 * ROCK_HZ));
  const spring = (lag: number) => (r > lag ? (Math.exp(-ROCK_FADE * (r - lag)) * Math.sin(w * (r - lag))) / peak : 0);
  return {
    offset: [round(0.15 * Math.sin(0.7 * tt) * fade), round(DRIFT * left), round(HEIGHT * left - ROCK_DIP * spring(0))],
    tilt: [round(-NOSE_UP * braking + sway(0.31, 0.73, 0.4) + ROCK_TIP * spring(0.06), 2), round(sway(0.23, 0.61, 1.9) + ROCK_ROLL * spring(0.12), 2)],
  };
}

/** The camera's place (the tripod's: on the ship's right side when `round` is within ±90°). */
export function tripodPlace(c: TripodCamera): [number, number, number] {
  return [-c.distance * Math.cos(c.round * DEG), -c.distance * Math.sin(c.round * DEG), c.height];
}

/** The tripod's key at `t` (seconds into the movement). */
export function tripodKey(c: TripodCamera, t: number): Omit<CameraKey, 't'> {
  const base = tripodPlace(c);
  const s = shipAt(Math.min(Math.max(0, t - c.lag), TOUCHDOWN));
  const camAt: [number, number, number] = [base[0], base[1], base[2] + c.follow * s.offset[2]];
  const target = [SHIP_MIDDLE[0] + s.offset[0], SHIP_MIDDLE[1] + s.offset[1], SHIP_MIDDLE[2] + s.offset[2]];
  const d = target.map((v, i) => v - camAt[i]!);
  const heading = Math.atan2(d[1]!, d[0]!) / DEG + c.aimLeft;
  const pitch = Math.atan2(d[2]!, Math.hypot(d[0]!, d[1]!)) / DEG - c.aimUnder;
  return { at: camAt.map((v) => round(v)) as [number, number, number], heading: round(heading, 2), pitch: round(pitch, 2), fov: c.fov };
}

/** The trim, kept within the movement. */
export function landingTrim(v: LandingValues): [number, number] {
  if (!v.trim) return [0, v.duration];
  const a = Math.min(Math.max(0, v.trim[0]), v.duration);
  return [a, Math.min(Math.max(a, v.trim[1]), v.duration)];
}

/** The power at `t` (seconds into the movement). */
export const powerAt = (v: LandingValues, t: number) => lerpKeys(v.power, t);

// --- The clouds (owner, 2026-11-10; plan landing-cutscene.md pass 4): a bank lying on the ground the ship
// comes down into, and puffs kicked up under the thrusters. All a function of the track's time. ---
const BANK = { count: 38, near: 4, far: 26, front: { size: [1.4, 2.6] as [number, number], sink: 0.12 }, back: { size: [2.6, 5.5] as [number, number], lift: 0.08 } };
/** No bank card nearer the camera than this (m). */
const BANK_CLEAR = 11;
const WIND: [number, number] = [0.18, 0.05];
const PUSH = { max: 7, radius: 11, ground: 5, drag: 0.8 };
const PUFFS = { count: 80, below: 9, travel: [3, 9] as [number, number], drag: 0.9, size: [[0.5, 1], [1.3, 2.6]] as [number, number][], grow: 0.7, life: [7, 14] as [number, number] };
const NOZZLES = [
  { at: [3.6, 2.0], share: 1 },
  { at: [-3.6, 2.0], share: 1 },
  { at: [3.0, -3.6], share: FRONT_FLAMES },
  { at: [-3.0, -3.6], share: FRONT_FLAMES },
];
const CLOUD_SEED = 7;

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The clouds for a power curve, the bank kept clear of the first camera. */
function cloudsFor(v: LandingValues, camBase: [number, number, number]): CloudTrack {
  const D = v.duration;
  const random = rng(CLOUD_SEED);
  const between = (a: number, b: number) => a + (b - a) * random();
  const groundThrust = (t: number) => lerpKeys(v.power, t) * Math.exp(-(NOZZLE_HEIGHT + shipAt(Math.min(t, TOUCHDOWN)).offset[2]) / PUSH.ground);
  const pushRaw: [number, number][] = [];
  {
    let vel = 0;
    let x = 0;
    const dt = 0.01;
    for (let i = 0; i * dt <= D + 1e-9; i++) {
      const t = i * dt;
      if (i % 10 === 0) pushRaw.push([round(t, 2), x]);
      vel += (groundThrust(t) - PUSH.drag * vel) * dt;
      x += vel * dt;
    }
  }
  const pushEnd = pushRaw[pushRaw.length - 1]![1] || 1;
  const push = pushRaw.map(([t, x]) => [t, round((x / pushEnd) * PUSH.max)] as [number, number]);
  const bank: CloudTrack['bank'] = [];
  while (bank.length < BANK.count) {
    const r = Math.sqrt(between(BANK.near ** 2, BANK.far ** 2));
    const a = between(0, 2 * Math.PI);
    const x = r * Math.cos(a);
    const y = r * Math.sin(a);
    if (Math.hypot(x - camBase[0], y - camBase[1]) < BANK_CLEAR) continue;
    const front = (x * camBase[0] + y * camBase[1]) / Math.hypot(camBase[0], camBase[1]) > 0;
    const size = front ? between(...BANK.front.size) : between(...BANK.back.size);
    const z = front ? -size * BANK.front.sink : size * BANK.back.lift;
    bank.push({ at: [round(x, 2), round(y, 2), round(z, 2)], size: round(size, 2), spin: round(between(0, 2 * Math.PI), 2), turn: round(between(-0.04, 0.04), 3), seed: round(random() * 100, 2) });
  }
  const puffs: CloudTrack['puffs'] = [];
  {
    const dt = 0.01;
    const shares = NOZZLES.reduce((s, n) => s + n.share, 0);
    let total = 0;
    for (let t = 0; t <= D; t += dt) if (NOZZLE_HEIGHT + shipAt(Math.min(t, TOUCHDOWN)).offset[2] < PUFFS.below) total += groundThrust(t) * dt;
    const strongest = groundThrust(TOUCHDOWN - 0.2) || 1;
    let sum = 0;
    let next = 0;
    for (let i = 0; i * dt <= D; i++) {
      const t = i * dt;
      const s = shipAt(Math.min(t, TOUCHDOWN));
      if (NOZZLE_HEIGHT + s.offset[2] >= PUFFS.below || total <= 0) continue;
      sum += (groundThrust(t) * dt * PUFFS.count) / total;
      while (sum > next) {
        next += 1;
        let pick = random() * shares;
        const n = NOZZLES.find((z) => (pick -= z.share) <= 0) ?? NOZZLES[0]!;
        const out = Math.atan2(n.at[1]!, n.at[0]!);
        const a = out + between(-1, 1) * between(0.6, Math.PI);
        const strength = Math.min(1, groundThrust(t) / strongest);
        puffs.push({
          born: round(t, 2),
          at: [round(n.at[0]! + s.offset[0], 2), round(n.at[1]! + s.offset[1], 2)],
          dir: [round(Math.cos(a), 3), round(Math.sin(a), 3)],
          travel: round(between(PUFFS.travel[0], PUFFS.travel[1]) * (0.5 + 0.5 * strength), 2),
          drag: PUFFS.drag,
          size: [round(between(...PUFFS.size[0]!), 2), round(between(...PUFFS.size[1]!), 2)],
          grow: PUFFS.grow,
          life: round(between(PUFFS.life[0], PUFFS.life[1]), 2),
          spin: round(between(0, 2 * Math.PI), 2),
          turn: round(between(-0.3, 0.3), 3),
          seed: round(random() * 100, 2),
        });
      }
    }
  }
  return { wind: WIND, radius: PUSH.radius, push, bank, puffs };
}

export interface LandingTrackOptions {
  id: string;
  /** The whole movement, the trim ignored (the editor shows it all, looping the trimmed part). */
  whole?: boolean;
}

/** The values → a cutscene track (cutscene.ts's format): the whole movement keyed as 0600 was, then cut to the trim. */
export function landingTrack(v: LandingValues, { id, whole = false }: LandingTrackOptions): Track {
  const D = v.duration;
  const first = v.cameras[0]!;
  const shipKeys: ShipKey[] = [];
  for (let i = 0; i * SHIP_STEP <= D + 1e-9; i++) shipKeys.push({ t: round(i * SHIP_STEP, 2), ...shipAt(i * SHIP_STEP) });

  // One shot per camera; each keyed every half second from its start to the next one's (pass 2: cuts).
  const shots: Track['shots'] = v.cameras.map((c, i) => {
    const end = v.cameras[i + 1]?.start ?? D;
    const camera: CameraKey[] = [];
    for (let t = c.start; t <= end + 1e-9; t += 0.5) camera.push({ t: round(t, 2), ...tripodKey(c, t) });
    return { start: c.start, camera, smooth: true, far: 4000, near: 0.5, seeThrough: 'off' as const, handheld: c.handheld };
  });

  const powerTimes = v.power.map((f) => f[0]);
  const flightTimes = [...new Set([0, GEAR[0], GEAR[1], ...powerTimes, ...NOISE.map((n) => n[0]), D])].sort((a, b) => a - b);
  for (let t = 0; t <= D; t += 0.5) if (!flightTimes.includes(t)) flightTimes.push(t);
  flightTimes.sort((a, b) => a - b);
  for (let t = 0; t <= D + 1e-9; t += 0.25) if (!flightTimes.includes(round(t, 2))) flightTimes.push(round(t, 2));
  flightTimes.sort((a, b) => a - b);
  const turbines = (t: number): [number, number] => {
    const back = 1 - smooth(TURN_BACK[0], TURN_BACK[1], t);
    const pitch = t < TOUCHDOWN ? shipAt(t).tilt[0] : 0;
    return [round(BACK_DOWN * back, 2), round((FRONT_DOWN + FRONT_CORRECTS * pitch) * back, 2)];
  };
  const reach = (t: number) => round(Math.min(1, (NOZZLE_HEIGHT + shipAt(Math.min(t, TOUCHDOWN)).offset[2] - CLEARANCE) / BACK_CONE));
  const flight: FlightKey[] = flightTimes.map((t) => ({
    t: round(t, 2),
    gear: round(1 - smooth(GEAR[0], GEAR[1], t)),
    flames: round(lerpKeys(v.power, t)),
    noise: round(lerpKeys(NOISE, t)),
    turbines: turbines(t),
    front: FRONT_FLAMES,
    reach: reach(t),
    glow: GLOW,
    planted: t >= TOUCHDOWN ? 1 : 0,
  }));

  const track: Track = {
    id,
    duration: D,
    shots,
    ship: shipKeys,
    flight,
    clouds: cloudsFor(v, tripodPlace(first)),
    speed: 0,
    hide: ['her'],
    events: [],
    end: [],
  };
  const [a, b] = whole ? [0, D] : landingTrim(v);
  return a <= 1e-6 && b >= D - 1e-6 ? track : cut(track, a, b);
}

/** Keys of `keys` within [a, b], shifted to start at 0, with a key made at each end (`at`: the value there). */
function window<K extends { t: number }>(keys: K[], a: number, b: number, at: (t: number) => K): K[] {
  const inside = keys.filter((k) => k.t > a + 1e-6 && k.t < b - 1e-6);
  return [at(a), ...inside, at(b)].map((k) => ({ ...k, t: round(k.t - a, 4) }));
}

/** Linear between two keys of the same shape (numbers and number arrays). */
function mixKey<K extends { t: number }>(keys: K[], t: number): K {
  const i = keys.findIndex((k) => k.t >= t);
  if (i <= 0) return { ...keys[i < 0 ? keys.length - 1 : 0]!, t };
  const p = keys[i - 1]!, q = keys[i]!;
  const s = (t - p.t) / (q.t - p.t);
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(q)) {
    const x = (p as Record<string, unknown>)[key], y = (q as Record<string, unknown>)[key];
    out[key] = typeof x === 'number' && typeof y === 'number' ? x + (y - x) * s : Array.isArray(x) && Array.isArray(y) ? x.map((n: number, j: number) => n + ((y[j] as number) - n) * s) : y;
  }
  out.t = t;
  return out as K;
}

/** The track cut to [a, b] seconds of its movement, starting at 0. */
function cut(track: Track, a: number, b: number): Track {
  const shots = track.shots
    .filter((s, i) => (track.shots[i + 1]?.start ?? track.duration) > a + 1e-6 && s.start < b - 1e-6)
    .map((s) => ({ ...s, start: round(Math.max(0, s.start - a), 4), camera: window(s.camera, Math.max(a, s.start), b, (t) => mixKey(s.camera, t)).map((k) => ({ ...k, t: round(k.t + Math.max(0, s.start - a), 4) })) }));
  return {
    ...track,
    duration: round(b - a, 4),
    shots,
    ship: track.ship && window(track.ship, a, b, (t) => mixKey(track.ship!, t)),
    flight: track.flight && window(track.flight, a, b, (t) => mixKey(track.flight!, t)),
    // The clouds keep the movement's time (their births, the push): played from `a` in.
    clouds: track.clouds && { ...track.clouds, from: a },
  };
}

// --- The seeds (pass 1: the tripod only) ---

function seeded(seed: number): () => number {
  return rng((seed * 2654435761) >>> 0);
}

/** A seed's values: the tripod drawn from `LANDING_RANGES`, 0600's motion and power. */
export function landingValues(seed: number, aspect = 16 / 9): LandingValues {
  const r = seeded(seed);
  const pick = (range: [number, number]) => range[0] + (range[1] - range[0]) * r();
  const R = LANDING_RANGES;
  const side = r() < 0.5 ? 1 : -1; // its right side (1) or its left
  const roundDeg = pick(R.round);
  const fov = pick(R.fov);
  const tanV = Math.tan((fov * DEG) / 2);
  // The ship sits off centre on the side its nose points to (the lead room behind it as it drifts forward).
  const nose = side; // seen from its right, the nose is to the frame's right
  const across = pick(R.across) * nose;
  const camera: TripodCamera = {
    type: 'tripod',
    start: 0,
    distance: round(pick(R.distance), 1),
    round: round(side > 0 ? roundDeg : 180 - roundDeg, 1),
    height: round(pick(R.height), 2),
    follow: 0,
    fov: round(fov, 1),
    aimLeft: round(-Math.atan(across * tanV * aspect) / DEG, 2),
    aimUnder: round(-Math.atan(pick(R.vertical) * tanV) / DEG, 2),
    lag: round(pick(R.lag), 2),
    handheld: round(pick(R.handheld), 2),
  };
  return { kind: 'landing', duration: LANDING_DURATION, cameras: [camera], power: LANDING_POWER.map((k) => [...k] as [number, number]) };
}

/** Where a point lands in the picture (-1..1 each way), or null behind the camera. */
export function landingInPicture(c: Omit<CameraKey, 't'>, p: readonly number[], aspect: number): [number, number] | null {
  const h = c.heading * DEG, pt = c.pitch * DEG;
  const d = [p[0]! - c.at[0], p[1]! - c.at[1], p[2]! - c.at[2]];
  const fwd = [Math.cos(pt) * Math.cos(h), Math.cos(pt) * Math.sin(h), Math.sin(pt)];
  const right = [Math.sin(h), -Math.cos(h), 0];
  const up = [-Math.sin(pt) * Math.cos(h), -Math.sin(pt) * Math.sin(h), Math.cos(pt)];
  const dot = (a: number[], b: number[]) => a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!;
  const z = dot(d, fwd);
  if (z <= 0.01) return null;
  const tanV = Math.tan((c.fov * DEG) / 2);
  return [dot(d, right) / z / (tanV * aspect), dot(d, up) / z / tanV];
}

/** The ship's box on the ground (the gear down), from its origin: for the checks. */
const LANDED_BOX: readonly [readonly number[], readonly number[]] = [[-5.68, -5.15, 0], [5.68, 10.48, 6.49]];

/** What's wrong with a landing (pass 1: the basic checks; pass 2 adds the rest). */
export function checkLanding(v: LandingValues, aspect = 16 / 9): string[] {
  const out: string[] = [];
  for (const c of v.cameras) {
    if (c.height < 0.05) out.push('camera under the ground');
    const at = tripodPlace(c);
    const nearest = Math.hypot(Math.max(LANDED_BOX[0]![0]! - at[0], 0, at[0] - LANDED_BOX[1]![0]!), Math.max(LANDED_BOX[0]![1]! - at[1], 0, at[1] - LANDED_BOX[1]![1]!));
    if (nearest < 6) out.push(`camera ${nearest.toFixed(1)} m from the ship`);
  }
  const [a, b] = landingTrim(v);
  let missing = 0;
  for (let t = a; t <= b + 1e-9; t += 0.5) {
    const c = [...v.cameras].reverse().find((k) => k.start <= t + 1e-9) ?? v.cameras[0]!;
    const k = tripodKey(c, t);
    const s = shipAt(Math.min(t, TOUCHDOWN));
    const p = landingInPicture(k, [SHIP_MIDDLE[0] + s.offset[0], SHIP_MIDDLE[1] + s.offset[1], SHIP_MIDDLE[2] + s.offset[2]], aspect);
    if (!p || Math.abs(p[0]) > 0.95 || Math.abs(p[1]) > 0.95) missing++;
  }
  if (missing) out.push(`the ship's middle out of frame ${missing}× (half-second steps)`);
  return out;
}

/** The buckets a landing is described by (pass 1: the side and the lens; pass 2: the camera types, order, sun). */
export interface LandingBuckets {
  side: 'right' | 'left';
  lens: 'wide' | 'normal' | 'long';
  height: 'ground' | 'raised';
}

export function landingBuckets(v: LandingValues): LandingBuckets {
  const c = v.cameras[0]!;
  const r = ((c.round % 360) + 360) % 360;
  return {
    side: r < 90 || r > 270 ? 'right' : 'left',
    lens: c.fov > 38 ? 'wide' : c.fov > 28 ? 'normal' : 'long',
    height: c.height < 1 ? 'ground' : 'raised',
  };
}
