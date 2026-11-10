// Writes the landing cutscene (0600), `public/cutscenes/landing.json`: the ship coming down onto the
// icy plain, seen as in the owner's reference render (2026-11-10): from the side, off the nose, about
// level with the ship and a little under its belly, a long lens, the ship in the frame's right half;
// a little hand-held. The ship's descent and sway are its `ship` keys (offsets from its landed place,
// Blender's axes: −Y is the nose, +X its left, +Z up); the gear, flames and engine noise its `flight`
// keys; the camera aims at the ship every half second, a little late, as an operator would.
// Run from the prototype folder: `node tools/landing-cutscene.mjs`. Plan: doc/plans/features/landing-cutscene.md

import { writeFileSync } from 'node:fs';

// --- Timing (s) ---
const DURATION = 11;
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

// --- The flames: times their strength; they flare as it brakes (owner, 2026-11-10) ---
const FLAMES = [[0, 0.7], [3, 0.8], [6.5, 1.5], [9.2, 1.7], [9.9, 0]];
/** The engine noise: on, faded out after touchdown. */
const NOISE = [[0, 1], [TOUCHDOWN, 1], [TOUCHDOWN + 1.5, 0]];

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
  const sway = (hz1, hz2, p) => SWAY * fade * (0.6 * Math.sin(2 * Math.PI * hz1 * t + p) + 0.4 * Math.sin(2 * Math.PI * hz2 * t + 2 * p));
  return {
    offset: [round(0.15 * Math.sin(0.7 * t) * fade), round(DRIFT * left), round(HEIGHT * left)],
    // Blender's X: positive tips the nose down.
    tilt: [round(-NOSE_UP * braking + sway(0.31, 0.73, 0.4), 2), round(sway(0.23, 0.61, 1.9), 2)],
  };
}

const shipKeys = [];
for (let t = 0; t <= DURATION + 1e-9; t += 0.25) shipKeys.push({ t: round(t, 2), ...ship(Math.min(t, TOUCHDOWN)) });

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
const flight = flightTimes.map((t) => ({ t: round(t, 2), gear: round(1 - smooth(GEAR[0], GEAR[1], t)), flames: round(lerpKeys(FLAMES, t)), noise: round(lerpKeys(NOISE, t)) }));

const track = {
  id: 'landing',
  duration: DURATION,
  shots: [{ start: 0, camera: cameraKeys, smooth: true, far: 4000, near: 0.5, seeThrough: 'off', handheld: HANDHELD }],
  ship: shipKeys,
  flight,
  speed: 0,
  hide: ['her'],
  events: [],
  end: [],
};

const out = new URL('../public/cutscenes/landing.json', import.meta.url);
writeFileSync(out, JSON.stringify(track, null, 1) + '\n');
console.log(`landing.json: ${DURATION} s, ${shipKeys.length} ship keys, ${cameraKeys.length} camera keys, ${flight.length} flight keys`);
