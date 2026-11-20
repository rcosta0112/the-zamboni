// The flyby generator's checks (plan doc/plans/features/flight-shots.md, pass 1), no browser:
// 1. today's 0400 (`tools/flyby-orbit.mjs`'s settings, as values) gives today's `public/cutscenes/flyby.json`;
// 2. a seed gives the same values twice; 3. many seeds: how many pass the checks at once, after re-rolls.
// Run from the prototype folder: `node --experimental-strip-types tools/flight-shots-check.mjs`.

import { readFileSync } from 'node:fs';
import { checkFlyby, flybyBuckets, flybyTrack, flybyValues, generateFlyby } from '../src/flight-shots/flyby.ts';

const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const c1 = read('../public/cutscenes/cutscene-1.json');
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
const sample = generateFlyby(7);
console.log(`seed 7: ${JSON.stringify(sample.values)} ${JSON.stringify(flybyBuckets(sample.values, 0))}`);

process.exit(failed ? 1 : 0);
