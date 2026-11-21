// The flyby generator's checks (plan doc/plans/features/flight-shots.md, pass 1), no browser:
// 1. today's 0400 (`tools/flyby-orbit.mjs`'s settings, as values) gives today's `public/cutscenes/flyby.json`;
// 2. a seed gives the same values twice; 3. many seeds: how many pass the checks at once, after re-rolls.
// Run from the prototype folder: `node --experimental-strip-types tools/flight-shots-check.mjs`.

import { readFileSync } from 'node:fs';
import { checkFlyby, flybyBuckets, flybyCamera, flybyTrack, flybyValues, generateFlyby, inPicture, sizeClass, sizeOnScreen, SHIP_CENTRE } from '../src/flight-shots/flyby.ts';

const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const c1 = read('./sources/cutscene-1.json');
const today = read('../public/cutscenes/flyby.json');
let failed = 0;
const report = (ok, what) => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${what}`);
  if (!ok) failed++;
};

// 1. Today's flyby as values: flyby-orbit.mjs's ORBIT 90, START 2, END 9.5 about cutscene 1's middle frame.
const ORBIT = 90, START = 2, END = 9.5;
const middle = c1.duration / 2;
const mid = c1.shots[0].camera.reduce((best, k) => (Math.abs(k.t - middle) < Math.abs(best.t - middle) ? k : best));
const [cx, cy, cz] = mid.at;
const bearing = (Math.atan2(cy, cx) * 180) / Math.PI;
const at = (t) => bearing + (t / c1.duration - 0.5) * ORBIT;
const distance = Math.hypot(cx, cy);
const values0400 = {
  kind: 'flyby',
  duration: END - START,
  bearing: [at(START), at(END)],
  distance: [distance, distance],
  height: cz,
  yaw: mid.heading - (bearing + 180),
  pitch: 0,
  fov: mid.fov,
  roll: 0,
  pace: 'even',
  swayStart: START,
};
const made = flybyTrack(values0400, { id: 'flyby', sway: c1.ship });
const keys = (track) => track.shots[0].camera;
let worst = 0;
for (const [i, k] of keys(today).entries()) {
  const m = keys(made)[i];
  if (!m) { worst = Infinity; break; }
  const heading = Math.abs(((m.heading - k.heading + 540) % 360) - 180);
  worst = Math.max(worst, Math.abs(m.t - k.t), ...k.at.map((n, j) => Math.abs(n - m.at[j])), heading, Math.abs(m.pitch - k.pitch), Math.abs(m.fov - k.fov));
}
report(keys(made).length === keys(today).length && worst <= 0.0011, `0400 from values: ${keys(made).length}/${keys(today).length} camera keys, largest difference ${worst.toFixed(4)} (rounding: 0.001)`);
report(JSON.stringify(made.ship) === JSON.stringify(today.ship), `0400 from values: the sway (${made.ship?.length} keys) as today's`);
report(made.duration === today.duration && JSON.stringify(made.hide) === JSON.stringify(today.hide), '0400 from values: duration and hide');
const { camera: _a, ...shotMade } = made.shots[0];
const { camera: _b, ...shotToday } = today.shots[0];
report(JSON.stringify(shotMade) === JSON.stringify(shotToday), `0400 from values: the shot's settings ${JSON.stringify(shotMade)}`);
report(checkFlyby(values0400).length === 0, `0400 passes the checks (${checkFlyby(values0400).join(', ') || 'none failed'}); buckets ${JSON.stringify(flybyBuckets(values0400))}`);

// 1b. Trimmed (owner, 2026-11-20): 0400 trimmed to 1.5–6 s plays 4.5 s, its first and last frames the whole
// movement's at 1.5 and 6 s (both on a key at 24 a second), the sway from 1.5 s further in.
{
  const trimmed = flybyTrack({ ...values0400, trim: [1.5, 6] }, { id: 'flyby', sway: c1.ship });
  const k = keys(trimmed), w = keys(made);
  const same = (a, b) => Math.max(...a.at.map((n, j) => Math.abs(n - b.at[j])), Math.abs(a.heading - b.heading), Math.abs(a.pitch - b.pitch)) <= 0.0011;
  const sway = flybyTrack({ ...values0400, swayStart: values0400.swayStart + 1.5, duration: 4.5 }, { id: 'flyby', sway: c1.ship }).ship;
  report(
    trimmed.duration === 4.5 && k.length === 109 && k[0].t === 0 && same(k[0], w[36]) && same(k[k.length - 1], w[144]) && JSON.stringify(trimmed.ship) === JSON.stringify(sway),
    `trimmed 1.5–6 s: ${trimmed.duration} s, ${k.length} keys, the ends the whole's at 1.5 and 6 s, the sway shifted`,
  );
  report(JSON.stringify(flybyTrack({ ...values0400, trim: [0, values0400.duration] }, { id: 'flyby', sway: c1.ship })) === JSON.stringify(made), 'trimmed to the whole: the same track');
}

// 1c. Pass 2d: the saved shot 0100 (`tools/shot-from-track.mjs`, start/end pairs and a curve pace) against
// cutscene 1's camera: the ship's centre on screen within 3% of the frame's width, its size within 2%; its sway
// cutscene 1's own.
{
  const shot = read('../public/cutscenes/shots.json').shots['0100'];
  if (!shot) report(false, 'the saved shot 0100 exists (run tools/shot-from-track.mjs)');
  else {
    const handheld = read('../public/cutscenes/handheld.json').keys;
    // Pass 2e: the game builds cutscene 1 this way (cutscene.ts `FROM_SHOTS`), the sway from `sway.json`.
    const sway = read('../public/cutscenes/sway.json').keys;
    report(JSON.stringify(sway) === JSON.stringify(c1.ship), `sway.json: cutscene 1's sway (${sway.length} keys)`);
    const track = flybyTrack(shot.values, { id: '0100', sway, handheld });
    const made = keys(track);
    let screen = 0, size = 0;
    for (const k of keys(c1)) {
      const m = made.reduce((p, q) => (Math.abs(q.t - k.t) < Math.abs(p.t - k.t) ? q : p));
      const p = inPicture(m, SHIP_CENTRE, 16 / 9), q = inPicture(k, SHIP_CENTRE, 16 / 9);
      screen = Math.max(screen, Math.hypot(p[0] - q[0], p[1] - q[1]) / 2);
      size = Math.max(size, Math.abs(sizeOnScreen(m, 16 / 9) / sizeOnScreen(k, 16 / 9) - 1));
    }
    // Since 2026-11-21 the owner edits 0100 in the shot editor: the fit to the Blender track is only reported.
    report(track.duration === c1.duration, `0100 as a saved shot: ${track.duration} s; vs the Blender track (reported, not checked: owner-edited): the ship's centre within ${(screen * 100).toFixed(1)}% of the frame's width, its size within ${(size * 100).toFixed(1)}%`);
    report(JSON.stringify(track.ship) === JSON.stringify(c1.ship), `0100 as a saved shot: the sway (${track.ship?.length} keys) cutscene 1's`);
    const roll = Math.max(...keys(c1).map((k, i) => Math.abs((k.roll ?? 0) - (made[i]?.roll ?? 0))));
    report(shot.values.handheld === 1 && handheld.length === keys(c1).length && roll <= 0.0011, `0100 as a saved shot: the handheld wobble on (its roll 0100's within ${roll.toFixed(4)}°)`);
    report(checkFlyby(shot.values).length === 0, `0100 passes the checks (${checkFlyby(shot.values).join(', ') || 'none failed'}); buckets ${JSON.stringify(flybyBuckets(shot.values))}`);
  }
}

// 2. The same seed, the same values.
report(JSON.stringify(flybyValues(1234)) === JSON.stringify(flybyValues(1234)) && JSON.stringify(flybyValues(1234)) !== JSON.stringify(flybyValues(1235)), 'a seed gives the same values each time, another seed others');

// 3. Many seeds.
const N = 500;
let atOnce = 0, usable = 0, rerolls = 0;
const reasons = {};
for (let seed = 1; seed <= N; seed++) {
  const p = checkFlyby(flybyValues(seed));
  if (!p.length) atOnce++;
  for (const r of p) reasons[r] = (reasons[r] ?? 0) + 1;
  const g = generateFlyby(seed);
  if (!g.problems.length) usable++;
  rerolls += g.rerolls;
}
report(usable === N, `${N} seeds: ${atOnce} pass at once, ${usable} after re-rolls (${(rerolls / N).toFixed(2)} re-rolls each on average); failures: ${JSON.stringify(reasons)}`);

// 4. Pass 2b's framing, over the usable shots: the lead room (the ship behind its travel on screen, at the
// start and the end, where it isn't centred), the sizes drawn, the size on screen against its target.
const nose = [0, -1, 0];
let leads = 0, against = 0, centred = 0, worstSize = 0;
const sizes = { wide: 0, medium: 0, close: 0 };
for (let seed = 1; seed <= N; seed++) {
  const { values } = generateFlyby(seed);
  sizes[sizeClass(values.size)]++;
  worstSize = Math.max(worstSize, Math.abs(sizeOnScreen(flybyCamera(values, 0.5), 16 / 9) / values.size - 1));
  for (const s of [0, 1]) {
    const c = flybyCamera(values, s);
    const p = inPicture(c, SHIP_CENTRE, 16 / 9);
    const q = inPicture(c, [SHIP_CENTRE[0] + nose[0] * 5, SHIP_CENTRE[1] + nose[1] * 5, SHIP_CENTRE[2]], 16 / 9);
    if (Math.abs(p[0]) < 0.1) centred++;
    else if (Math.sign(q[0] - p[0]) === -Math.sign(p[0])) leads++;
    else against++;
  }
}
report(against <= N * 0.02, `lead room at the ends (${2 * N}): ${leads} behind the travel, ${centred} centred, ${against} against it`);
report(worstSize < 0.15, `the size on screen at the middle within ${(worstSize * 100).toFixed(1)}% of its target; sizes drawn (usable): ${JSON.stringify(sizes)}`);
const sample = generateFlyby(7);
console.log(`seed 7: ${JSON.stringify(sample.values)} ${JSON.stringify(flybyBuckets(sample.values, 0))}`);

process.exit(failed ? 1 : 0);
