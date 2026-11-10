// Writes the landing cutscene (0600), `public/cutscenes/landing.json`: the ship coming down onto the
// icy plain, seen as in the owner's reference render (2026-11-10): from the side, off the nose, about
// level with the ship and a little under its belly, a long lens, the ship in the frame's right half;
// a little hand-held. The ship's descent and sway are its `ship` keys (offsets from its landed place,
// Blender's axes: −Y is the nose, +X its left, +Z up); the gear, flames and engine noise its `flight`
// keys; the camera aims at the ship every half second, a little late, as an operator would.
// The clouds on the ground (pass 4): the resting bank, the downwash's push, the kicked-up puffs (`clouds`).
// Run from the prototype folder: `node tools/landing-cutscene.mjs`. Plan: doc/plans/features/landing-cutscene.md

import { writeFileSync } from 'node:fs';

// --- Timing (s) ---
/** Lengthened for the turbines turning back after touchdown (owner, 2026-11-10). */
const DURATION = 16;
/** The gear's feet touch the ground. */
const TOUCHDOWN = 9.5;
/** The gear comes down between these. */
const GEAR = [4, 7.5];

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

// --- The rocking on the gear (pass 3; owner, 2026-11-10): on touchdown the ship dips and tips nose down,
// springing back in a few fading rocks (a damped spring, baked into the `ship` keys) ---
/** The dip (m) and the nose-down tip (degrees) at their first, largest swing; a little roll too. */
// Heavier (owner, 2026-11-10): the rocking 40% less (tip and roll ×0.6; each swing back 0.33 of the one
// before, was 0.55), the dip deeper (5 → 9 cm) and slower (1.7 → 1.3 rocks a second).
const ROCK_DIP = 0.09;
const ROCK_TIP = 0.9;
const ROCK_ROLL = 0.24;
/** The rocks per second, and how fast they fade (1/s: about 5% left after 1.5 s). */
const ROCK_HZ = 1.3;
const ROCK_FADE = 2.86;
/** The ship keys' spacing (s): fine enough for the rocks. */
const SHIP_STEP = 0.05;

// --- The flames: times their strength; they flare as it brakes (owner, 2026-11-10) ---
const FLAMES = [[0, 0.7], [3, 0.8], [6.5, 1.5], [9.2, 1.7], [9.9, 0]];
/** The engine noise: on, faded out after touchdown. */
const NOISE = [[0, 1], [TOUCHDOWN, 1], [TOUCHDOWN + 1.5, 0]];

// --- The turbines (pass 2; owner, 2026-11-10): down from the shot's start, balancing the ship ---
/** The back pair, degrees down: straight down, doing the lifting (the heavier back half). */
const BACK_DOWN = 90;
/** The front pair: past straight down, its flames down and forward (owner, 2026-11-10: facing forward
 *  to balance the ship); correcting as it rocks: toward straight down as the nose dips (degrees per
 *  degree of the ship's pitch, nose down positive). */
const FRONT_DOWN = 115;
const FRONT_CORRECTS = -5;
/** The front pair's share of the flames' strength (smaller flames). */
const FRONT_FLAMES = 0.6;
/** After touchdown, once the engines are off, they turn back slowly (owner): between these (s). */
const TURN_BACK = [11, 15];
/** The flames' length near the ground: shortened so the back pair's cones (7.6 m) end about this far
 *  above the ice (m); the nozzles are about 3.5 m over the gear's feet, pointing down. */
const NOZZLE_HEIGHT = 3.5;
const BACK_CONE = 7.58;
const CLEARANCE = 0.3;
/** The painted bloom's level (it flares with the flames' strength in the game). */
const GLOW = 1;

// --- The camera (the reference's angle) ---
/** Its place from the ship's landed centre: this far, this many degrees round from its side toward its nose, this high
 *  at the end (m); it comes down with the ship (`follow`: the share of the ship's height it keeps under it), so it
 *  stays about level, a little under the belly, as the reference. */
// Owner, 2026-11-10 (a second reference, the landed ship from near the ground): close, low, a wider
// lens, further round toward the nose; the camera stays down (follow 0: the belly fills the frame
// early on, the owner's to look at). 0.14 m over the ship's origin is 0.7 m over the ground there
// (the ground falls 0.56 m from the ship to that spot).
const CAMERA = { distance: 20, round: 50, height: 0.14, follow: 0 };
/** Vertical field of view (degrees): a long lens. */
const FOV = 39;
/** The point aimed at on the ship, from its origin (its gear's feet): about the hull's middle. */
const SHIP_MIDDLE = [0, 0, 2.6];
/** The aim off the ship (degrees): left of it (positive: the ship sits right of centre), under it (positive: it
 *  sits above). Owner, 2026-11-10: the second reference's place, the ship's middle about 37% across, a little
 *  above the frame's middle, the horizon low. */
const AIM_LEFT = -7.6;
const AIM_UNDER = -0.5;
/** The operator's lag (s): aims where the ship was this long ago. */
const LAG = 0.35;
const HANDHELD = 2.1; // 1.3 at the 20° lens: raised for the wider one, so it reads the same

// ---------------------------------------------------------------------------------------------

const round = (v, d = 3) => Math.round(v * 10 ** d) / 10 ** d;
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (a, b, t) => {
  const u = clamp01((t - a) / (b - a));
  return u * u * (3 - 2 * u);
};

/** The ship's offset and tilt at `t`. */
function ship(t) {
  const u = clamp01(t / TOUCHDOWN);
  const left = (1 - u) ** EASE;
  const fade = Math.sqrt(1 - u);
  // Braking the drift: strongest early, gone by touchdown.
  const braking = (1 - u) ** (EASE - 1);
  const tt = Math.min(t, TOUCHDOWN);
  const sway = (hz1, hz2, p) => SWAY * fade * (0.6 * Math.sin(2 * Math.PI * hz1 * tt + p) + 0.4 * Math.sin(2 * Math.PI * hz2 * tt + 2 * p));
  // After touchdown: the spring, starting at rest and swinging down first; each swing normalised so its
  // first peak is the full size (sin's first peak is a quarter period in, already faded a little).
  const r = Math.max(0, t - TOUCHDOWN);
  const w = 2 * Math.PI * ROCK_HZ;
  const peak = Math.exp(-ROCK_FADE / (4 * ROCK_HZ));
  const spring = (lag) => (r > lag ? (Math.exp(-ROCK_FADE * (r - lag)) * Math.sin(w * (r - lag))) / peak : 0);
  return {
    offset: [round(0.15 * Math.sin(0.7 * tt) * fade), round(DRIFT * left), round(HEIGHT * left - ROCK_DIP * spring(0))],
    // Blender's X: positive tips the nose down. The tip follows the dip a moment late (the front gear
    // takes the weight after the back), the roll later still.
    tilt: [round(-NOSE_UP * braking + sway(0.31, 0.73, 0.4) + ROCK_TIP * spring(0.06), 2), round(sway(0.23, 0.61, 1.9) + ROCK_ROLL * spring(0.12), 2)],
  };
}

const shipKeys = [];
for (let i = 0; i * SHIP_STEP <= DURATION + 1e-9; i++) shipKeys.push({ t: round(i * SHIP_STEP, 2), ...ship(i * SHIP_STEP) });

const toRad = Math.PI / 180;
// The ship's left is +X; the reference sees its right flank (the side door, x < 0), the nose to the
// frame's right: the camera on −X, turned toward the nose (−Y).
const camBase = [-CAMERA.distance * Math.cos(CAMERA.round * toRad), -CAMERA.distance * Math.sin(CAMERA.round * toRad), CAMERA.height];

const cameraKeys = [];
for (let t = 0; t <= DURATION + 1e-9; t += 0.5) {
  const s = ship(Math.min(Math.max(0, t - LAG), TOUCHDOWN));
  const camAt = [camBase[0], camBase[1], camBase[2] + CAMERA.follow * s.offset[2]];
  const target = [SHIP_MIDDLE[0] + s.offset[0], SHIP_MIDDLE[1] + s.offset[1], SHIP_MIDDLE[2] + s.offset[2]];
  const d = target.map((v, i) => v - camAt[i]);
  const heading = Math.atan2(d[1], d[0]) / toRad + AIM_LEFT;
  const pitch = Math.atan2(d[2], Math.hypot(d[0], d[1])) / toRad - AIM_UNDER;
  cameraKeys.push({ t: round(t, 2), at: camAt.map((v) => round(v)), heading: round(heading, 2), pitch: round(pitch, 2), fov: FOV });
}

const flightTimes = [...new Set([0, GEAR[0], GEAR[1], ...FLAMES.map((f) => f[0]), ...NOISE.map((n) => n[0]), DURATION])].sort((a, b) => a - b);
// Every half second too, so the gear's ease and the flames read smoothly between the linear keys.
for (let t = 0; t <= DURATION; t += 0.5) if (!flightTimes.includes(t)) flightTimes.push(t);
flightTimes.sort((a, b) => a - b);
const lerpKeys = (pairs, t) => {
  const p = pairs;
  if (t <= p[0][0]) return p[0][1];
  for (let i = 1; i < p.length; i++) if (t <= p[i][0]) return p[i - 1][1] + ((p[i][1] - p[i - 1][1]) * (t - p[i - 1][0])) / (p[i][0] - p[i - 1][0]);
  return p[p.length - 1][1];
};
// The turbines and the flames' reach every quarter second (the front pair follows the sway).
for (let t = 0; t <= DURATION + 1e-9; t += 0.25) if (!flightTimes.includes(round(t, 2))) flightTimes.push(round(t, 2));
flightTimes.sort((a, b) => a - b);
const turbines = (t) => {
  const back = 1 - smooth(TURN_BACK[0], TURN_BACK[1], t);
  const pitch = t < TOUCHDOWN ? ship(t).tilt[0] : 0;
  return [round(BACK_DOWN * back, 2), round((FRONT_DOWN + FRONT_CORRECTS * pitch) * back, 2)];
};
const reach = (t) => {
  const height = ship(Math.min(t, TOUCHDOWN)).offset[2];
  return round(Math.min(1, (NOZZLE_HEIGHT + height - CLEARANCE) / BACK_CONE));
};
const flight = flightTimes.map((t) => ({
  t: round(t, 2),
  gear: round(1 - smooth(GEAR[0], GEAR[1], t)),
  flames: round(lerpKeys(FLAMES, t)),
  noise: round(lerpKeys(NOISE, t)),
  turbines: turbines(t),
  front: FRONT_FLAMES,
  reach: reach(t),
  glow: GLOW,
  // The gear stays where it touched down while the hull rocks on it (owner, 2026-11-10).
  planted: t >= TOUCHDOWN ? 1 : 0,
}));

// --- The clouds (pass 4; owner, 2026-11-10): a bank lying on the ground that the ship comes down
// into, and puffs kicked up under the thrusters. Drawn as the owner's Cloud.blend draws them (clouds.ts).
// Everything here is a function of the track's time, so a replay or a skip lands on the same frame.
// Places in Blender's axes from the ship's landed origin (its gear's feet; the ground ≈ z 0 there).
// They needn't be gone by the end (owner: the next scene is indoors). ---
/** The resting bank: this many cards, between these distances from the ship (m). The camera is 0.7 m off
 *  the ice, so on its side of the ship the cards are small and sunk (`front`: sizes, m; their middles this
 *  share of their size under the ice): the gear in the cloud, the hull clear; behind the ship, bigger
 *  (`back`), their middles a share of their size over it. */
const BANK = { count: 38, near: 4, far: 26, front: { size: [1.4, 2.6], sink: 0.12 }, back: { size: [2.6, 5.5], lift: 0.08 } };
// Each puff smaller (owner, 2026-11-10): sizes ×0.65 (were front 2.2–4, back 4–8.5, kicked-up 0.8–1.5 → 2–4).
/** No bank card nearer the camera than this (m): none smeared over the lens. */
const BANK_CLEAR = 11;
/** The wind's drift (m/s, Blender X and Y): the whole bank, slowly. */
const WIND = [0.18, 0.05];
/** The downwash's push: the bank pushed out from under the ship as the thrust nears the ground.
 *  `max`: how far a card right under it has gone by the end (m); `radius`: the push falls off over
 *  this (m, a card this far out moves 37% as far); `ground`: the thrust's reach over the ice (m);
 *  `drag`: how fast a pushed card slows (1/s). */
const PUSH = { max: 7, radius: 11, ground: 5, drag: 0.8 };
/** The kicked-up puffs: about this many, while the nozzles are within `below` m of the ice and the
 *  flames are on; each rolls out `travel` m (min, max), slowing at `drag` (1/s), growing from
 *  `size[0]` to `size[1]` (m, at `grow` 1/s), thinning out over `life` s (min, max). */
const PUFFS = { count: 80, below: 9, travel: [3, 9], drag: 0.9, size: [[0.5, 1], [1.3, 2.6]], grow: 0.7, life: [7, 14] };
/** Where the thrusters meet the ice, from the landed origin (m): the back pair straight down, the
 *  front pair down and forward (tools/thruster-flames' nozzles, the turbines turned). */
const NOZZLES = [
  { at: [3.6, 2.0], share: 1 },
  { at: [-3.6, 2.0], share: 1 },
  { at: [3.0, -3.6], share: FRONT_FLAMES },
  { at: [-3.0, -3.6], share: FRONT_FLAMES },
];
/** The seed: change it for another layout. */
const CLOUD_SEED = 7;

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const random = rng(CLOUD_SEED);
const between = (a, b) => a + (b - a) * random();

/** The thrust's hold on the ice at `t`: the flames' strength, fading with the nozzles' height. */
const groundThrust = (t) => lerpKeys(FLAMES, t) * Math.exp(-(NOZZLE_HEIGHT + ship(Math.min(t, TOUCHDOWN)).offset[2]) / PUSH.ground);

// The push: a card driven by the thrust, slowing by drag; scaled so one right under the ship has gone `max`.
const pushRaw = [];
{
  let v = 0;
  let x = 0;
  const dt = 0.01;
  for (let i = 0; i * dt <= DURATION + 1e-9; i++) {
    const t = i * dt;
    if (i % 10 === 0) pushRaw.push([round(t, 2), x]);
    v += (groundThrust(t) - PUSH.drag * v) * dt;
    x += v * dt;
  }
}
const pushEnd = pushRaw[pushRaw.length - 1][1];
const push = pushRaw.map(([t, x]) => [t, round((x / pushEnd) * PUSH.max)]);

const bank = [];
while (bank.length < BANK.count) {
  // Even over the ring's area (more cards further out), a little thinner right under the camera's sight.
  const r = Math.sqrt(between(BANK.near ** 2, BANK.far ** 2));
  const a = between(0, 2 * Math.PI);
  const x = r * Math.cos(a);
  const y = r * Math.sin(a);
  if (Math.hypot(x - camBase[0], y - camBase[1]) < BANK_CLEAR) continue;
  // On the camera's side of the ship, or behind it (the soft edge hides the cut into the ice).
  const front = (x * camBase[0] + y * camBase[1]) / Math.hypot(camBase[0], camBase[1]) > 0;
  const size = front ? between(...BANK.front.size) : between(...BANK.back.size);
  const z = front ? -size * BANK.front.sink : size * BANK.back.lift;
  bank.push({ at: [round(x, 2), round(y, 2), round(z, 2)], size: round(size, 2), spin: round(between(0, 2 * Math.PI), 2), turn: round(between(-0.04, 0.04), 3), seed: round(random() * 100, 2) });
}

// The puffs' births: spread over the thrust near the ice (more where it's stronger), each nozzle by its share.
const puffs = [];
{
  const dt = 0.01;
  const shares = NOZZLES.reduce((s, n) => s + n.share, 0);
  let total = 0;
  for (let t = 0; t <= DURATION; t += dt) if (NOZZLE_HEIGHT + ship(Math.min(t, TOUCHDOWN)).offset[2] < PUFFS.below) total += groundThrust(t) * dt;
  let sum = 0;
  let next = 0;
  for (let i = 0; i * dt <= DURATION; i++) {
    const t = i * dt;
    const s = ship(Math.min(t, TOUCHDOWN));
    if (NOZZLE_HEIGHT + s.offset[2] >= PUFFS.below) continue;
    sum += (groundThrust(t) * dt * PUFFS.count) / total;
    while (sum > next) {
      next += 1;
      // A nozzle by share; a direction all round, leaning away from under the ship.
      let pick = random() * shares;
      const n = NOZZLES.find((z) => (pick -= z.share) <= 0) ?? NOZZLES[0];
      const out = Math.atan2(n.at[1], n.at[0]);
      const a = out + between(-1, 1) * between(0.6, Math.PI);
      const strength = Math.min(1, groundThrust(t) / groundThrust(TOUCHDOWN - 0.2));
      puffs.push({
        born: round(t, 2),
        at: [round(n.at[0] + s.offset[0], 2), round(n.at[1] + s.offset[1], 2)],
        dir: [round(Math.cos(a), 3), round(Math.sin(a), 3)],
        travel: round(between(PUFFS.travel[0], PUFFS.travel[1]) * (0.5 + 0.5 * strength), 2),
        drag: PUFFS.drag,
        size: [round(between(...PUFFS.size[0]), 2), round(between(...PUFFS.size[1]), 2)],
        grow: PUFFS.grow,
        life: round(between(PUFFS.life[0], PUFFS.life[1]), 2),
        spin: round(between(0, 2 * Math.PI), 2),
        turn: round(between(-0.3, 0.3), 3),
        seed: round(random() * 100, 2),
      });
    }
  }
}

const track = {
  id: 'landing',
  duration: DURATION,
  shots: [{ start: 0, camera: cameraKeys, smooth: true, far: 4000, near: 0.5, seeThrough: 'off', handheld: HANDHELD }],
  ship: shipKeys,
  flight,
  clouds: { wind: WIND, radius: PUSH.radius, push, bank, puffs },
  speed: 0,
  hide: ['her'],
  events: [],
  end: [],
};

const out = new URL('../public/cutscenes/landing.json', import.meta.url);
writeFileSync(out, JSON.stringify(track, null, 1) + '\n');
console.log(`landing.json: ${DURATION} s, ${shipKeys.length} ship keys, ${cameraKeys.length} camera keys, ${flight.length} flight keys, ${bank.length} bank clouds, ${puffs.length} puffs (${puffs[0]?.born}–${puffs[puffs.length - 1]?.born} s)`);
