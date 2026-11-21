// A saved flight shot measured from a Blender camera (plan doc/plans/features/flight-shots.md, pass 2d): 0100
// (`cutscene-1.json`) as flyby values, written into `public/cutscenes/shots.json` under the name `0100` (seed 0:
// not drawn by the generator). 0100's camera dollies in a straight line while zooming, both on one timing curve;
// the values take its first and last frames (bearing, distance, height, the view's turn and tip off the ship, the
// lens) and the timing curve fitted here (a cubic-bezier, as `pace`). Prints how far the shot's picture is from
// 0100's (the ship's centre on screen, its size).
// **The handheld wobble** (owner, 2026-11-20: "we need the wobble"): 0100's turn and tip less the fitted shot's,
// their slow part taken off (a Gaussian, `WOBBLE_SIGMA`: that's the fit's own error, the pan's curve), and its
// whole roll (0100 has no roll of its own), written as `public/cutscenes/handheld.json`; `0100` gets `handheld: 1`.
// Any shot can use it (the editor's *handheld* amount, from its *sway from* moment).
// **The ship's sway** (pass 2e): 0100's, copied as `public/cutscenes/sway.json`, every flyby's sway (the game, the editor).
// The Blender track itself is kept out of the game's files, in `tools/sources/` (`flyby-cutscene.py` writes it).
// Run from the prototype folder: `node --experimental-strip-types tools/shot-from-track.mjs`.

import { readFileSync, writeFileSync } from 'node:fs';
import { flybyTrack, inPicture, paced, sizeOnScreen, SHIP_CENTRE } from '../src/flight-shots/flyby.ts';

const NAME = '0100';
const SOURCE = new URL('./sources/cutscene-1.json', import.meta.url);
const SHOTS = new URL('../public/cutscenes/shots.json', import.meta.url);
const HANDHELD = new URL('../public/cutscenes/handheld.json', import.meta.url);
const SWAY = new URL('../public/cutscenes/sway.json', import.meta.url);
/** The wobble keeps what changes faster than this (s, a Gaussian's sigma) in the turn and the tip. */
const WOBBLE_SIGMA = 1;
const ASPECT = 16 / 9;
const DEG = Math.PI / 180;
const round = (v, n = 3) => Math.round(v * 10 ** n) / 10 ** n;

const c1 = JSON.parse(readFileSync(SOURCE, 'utf8'));
const cam = c1.shots[0].camera;
const first = cam[0], last = cam[cam.length - 1];

/** A key in the values' terms. */
function measure(k) {
  const [x, y, z] = k.at;
  const bearing = Math.atan2(y, x) / DEG;
  const yaw = ((k.heading - (bearing + 180) + 540) % 360) - 180;
  const ahead = (SHIP_CENTRE[0] - x) * Math.cos(k.heading * DEG) + (SHIP_CENTRE[1] - y) * Math.sin(k.heading * DEG);
  return { bearing, distance: Math.hypot(x, y), height: z, yaw, pitch: Math.atan2(SHIP_CENTRE[2] - z, ahead) / DEG - k.pitch, fov: k.fov };
}

// The timing: how far along its straight line the camera is at each key, against a cubic-bezier (a coarse search, then finer).
const line = last.at.map((v, j) => v - first.at[j]);
const along = (k) => k.at.reduce((sum, v, j) => sum + (v - first.at[j]) * line[j], 0) / line.reduce((sum, v) => sum + v * v, 0);
const error = (c) => cam.reduce((worst, k) => Math.max(worst, Math.abs(paced(c, k.t / c1.duration) - along(k))), 0);
let best = { c: [0.4, 0, 0.6, 1], e: Infinity };
for (const step of [0.05, 0.01, 0.002]) {
  const [b0, b1, b2, b3] = best.c;
  const span = step === 0.05 ? null : step * 5;
  const values = (centre, lo, hi) => {
    const out = [];
    for (let v = span ? centre - span : lo; v <= (span ? centre + span : hi) + 1e-9; v += step) out.push(v);
    return out;
  };
  for (const x1 of values(b0, 0, 1)) for (const y1 of values(b1, -0.2, 0.6)) for (const x2 of values(b2, 0, 1)) for (const y2 of values(b3, 0.4, 1.2)) {
    if (x1 < 0 || x1 > 1 || x2 < 0 || x2 > 1) continue;
    const c = [x1, y1, x2, y2];
    const e = cam.filter((_, i) => i % 8 === 0).reduce((w, k) => Math.max(w, Math.abs(paced(c, k.t / c1.duration) - along(k))), 0);
    if (e < best.e) best = { c, e };
  }
}
const pace = best.c.map((v) => round(v));

const a = measure(first), b = measure(last);
const values = {
  kind: 'flyby',
  duration: c1.duration,
  bearing: [round(a.bearing, 2), round(b.bearing, 2)],
  distance: [round(a.distance, 2), round(b.distance, 2)],
  height: [round(a.height, 2), round(b.height, 2)],
  yaw: [round(a.yaw, 2), round(b.yaw, 2)],
  pitch: [round(a.pitch, 2), round(b.pitch, 2)],
  fov: [round(a.fov, 2), round(b.fov, 2)],
  roll: 0,
  pace,
  swayStart: 0,
};

// The wobble: 0100's keys against the fitted shot's (both 24 a second from 0).
const plain = flybyTrack(values, { id: NAME, sway: c1.ship }).shots[0].camera;
if (plain.length !== cam.length) throw new Error(`keys: ${plain.length} made, ${cam.length} in 0100`);
const rate = (cam.length - 1) / c1.duration;
const highPass = (r) => {
  const sig = WOBBLE_SIGMA * rate;
  return r.map((x, i) => {
    let sum = 0, weight = 0;
    for (let j = Math.max(0, Math.floor(i - 4 * sig)); j <= Math.min(r.length - 1, Math.ceil(i + 4 * sig)); j++) {
      const g = Math.exp(-((j - i) ** 2) / (2 * sig * sig));
      sum += r[j] * g;
      weight += g;
    }
    return x - sum / weight;
  });
};
const dh = highPass(cam.map((k, i) => k.heading - plain[i].heading));
const dp = highPass(cam.map((k, i) => k.pitch - plain[i].pitch));
const keysOut = cam.map((k, i) => ({ t: k.t, heading: round(dh[i], 4), pitch: round(dp[i], 4), roll: round((k.roll ?? 0) - (plain[i].roll ?? 0), 4) }));
writeFileSync(HANDHELD, JSON.stringify({ source: 'cutscene-1.json (0100), tools/shot-from-track.mjs', sigma: WOBBLE_SIGMA, keys: keysOut }));
values.handheld = 1;
writeFileSync(SWAY, JSON.stringify({ source: 'cutscene-1.json (0100), tools/shot-from-track.mjs', keys: c1.ship }));
const most = (n) => Math.max(...keysOut.map((k) => Math.abs(k[n]))).toFixed(3);

// How close: the ship's centre on screen and its size, key by key.
const made = flybyTrack(values, { id: NAME, sway: c1.ship, handheld: keysOut }).shots[0].camera;
// The wobble as played: the shot's keys less the plain shot's against 0100's fast shake (0 but for rounding).
const left = Math.max(...cam.map((k, i) => Math.max(Math.abs(made[i].heading - plain[i].heading - dh[i]), Math.abs(made[i].pitch - plain[i].pitch - dp[i]), Math.abs((made[i].roll ?? 0) - (k.roll ?? 0)))));
let screen = 0, size = 0, place = 0;
for (const k of cam) {
  const m = made.reduce((p, q) => (Math.abs(q.t - k.t) < Math.abs(p.t - k.t) ? q : p));
  const p = inPicture(m, SHIP_CENTRE, ASPECT), q = inPicture(k, SHIP_CENTRE, ASPECT);
  screen = Math.max(screen, Math.hypot(p[0] - q[0], p[1] - q[1]) / 2);
  size = Math.max(size, Math.abs(sizeOnScreen(m, ASPECT) / sizeOnScreen(k, ASPECT) - 1));
  place = Math.max(place, Math.hypot(...m.at.map((v, j) => v - k.at[j])));
}

const file = JSON.parse(readFileSync(SHOTS, 'utf8'));
file.shots[NAME] = { kind: 'flyby', seed: 0, values, saved: new Date().toISOString().slice(0, 10) };
writeFileSync(SHOTS, JSON.stringify(file, null, 2) + '\n');
console.log(`shots.json: “${NAME}” from cutscene-1.json (${c1.duration} s); pace [${pace}] (timing within ${(best.e * 100).toFixed(2)}%)`);
console.log(`sway.json: ${c1.ship.length} keys`);
console.log(`handheld.json: ${keysOut.length} keys, the wobble at most ${most('heading')}° turn, ${most('pitch')}° tip, ${most('roll')}° roll; played within ${left.toFixed(4)}° of 0100's`);
console.log(`against 0100: the ship's centre within ${(screen * 100).toFixed(1)}% of the frame's width, its size within ${(size * 100).toFixed(1)}%, the camera within ${place.toFixed(1)} m`);
console.log(JSON.stringify(values));
