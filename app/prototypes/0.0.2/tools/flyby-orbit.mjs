// Writes the flyby (0400), `public/cutscenes/flyby.json` (owner, 2026-11-20): the camera of cutscene 1's
// middle frame (0100, `cutscene-1.json`) is the flyby's middle frame; from there the camera orbits the
// ship from left to right as it flies, 90 degrees in all (45 either side of the middle), at an even
// rate. The camera's place and heading turn together about the vertical line through the ship's
// origin, so the middle frame is 0100's and the ship stays where that frame has it, turning under the
// camera. Height and lens held at the middle frame's; no shake. **Trimmed** (owner, 2026-11-20): the shot
// starts START seconds into that orbit and ends at END (the owner's two frames), the rest cut. **The ship centred
// vertically** (owner, 2026-11-20): each key's pitch aims at the ship's centre (its box, SHIP_CENTRE),
// so it sits at the picture's vertical middle (left of the middle, as 0100's frame has it).
// The ship's sway and everything else copied from cutscene 1 (its sway trimmed the same way).
// Run from the prototype folder: `node tools/flyby-orbit.mjs`. Plan: doc/plans/features/flyby-0400.md

import { readFileSync, writeFileSync } from 'node:fs';

/** The orbit, degrees in all, centred on the middle frame; positive: the camera moves to its right. */
const ORBIT = 90;
/** Seconds; cutscene 1's length if null: the orbit's whole timeline, before the trim. */
const DURATION = null;
/** Seconds cut from the orbit's start (owner, 2026-11-20: the shot starts at the owner's frame, about 2 s in). */
const START = 2;
/** Seconds into the orbit where the shot ends (owner, 2026-11-20: the owner's frame, the ship from ahead of its right side). */
const END = 9.5;
/** The ship's centre (its bounding box, measured in the game), in the ship file's Blender coordinates. */
const SHIP_CENTRE = [0.03, 2.66, 3.24];
/** Camera keys per second (a `smooth` shot: a curve through them). */
const RATE = 24;

const SOURCE = new URL('../public/cutscenes/cutscene-1.json', import.meta.url);
const OUT = new URL('../public/cutscenes/flyby.json', import.meta.url);

const c1 = JSON.parse(readFileSync(SOURCE, 'utf8'));
const shot = c1.shots[0];
const middle = c1.duration / 2;
const mid = shot.camera.reduce((best, k) => (Math.abs(k.t - middle) < Math.abs(best.t - middle) ? k : best));

const DEG = Math.PI / 180;
const [cx, cy, cz] = mid.at;
/** The ship's origin, in its own Blender coordinates (the cutscene's). */
const pivot = [0, 0];
const rel = [cx - pivot[0], cy - pivot[1]];

const duration = DURATION ?? c1.duration;
const round = (v, n = 3) => Math.round(v * 10 ** n) / 10 ** n;
const camera = [];
const steps = Math.round((END - START) * RATE);
for (let i = 0; i <= steps; i++) {
  const t = START + (i / steps) * (END - START);
  // Turning the camera's place counter-clockwise (seen from above) about the pivot moves it to its right.
  const a = (t / duration - 0.5) * ORBIT * DEG;
  const x = pivot[0] + rel[0] * Math.cos(a) - rel[1] * Math.sin(a);
  const y = pivot[1] + rel[0] * Math.sin(a) + rel[1] * Math.cos(a);
  const heading = mid.heading + a / DEG;
  // The pitch that puts the ship's centre on the picture's horizontal middle line: its height over its distance along the view.
  const ahead = (SHIP_CENTRE[0] - x) * Math.cos(heading * DEG) + (SHIP_CENTRE[1] - y) * Math.sin(heading * DEG);
  const pitch = Math.atan2(SHIP_CENTRE[2] - cz, ahead) / DEG;
  camera.push({ t: round(t - START, 4), at: [round(x), round(y), round(cz)], heading: round(heading), pitch: round(pitch), fov: round(mid.fov, 2) });
}

const ship = c1.ship?.filter((k) => k.t >= START && k.t <= END).map((k) => ({ ...k, t: round(k.t - START, 4) }));
const track = {
  id: 'flyby',
  duration: round(END - START, 4),
  ...(ship ? { ship } : {}),
  hide: c1.hide,
  events: [],
  end: [],
  shots: [{ ...shot, start: 0, camera, smooth: true }],
};
writeFileSync(OUT, JSON.stringify(track));
console.log(`flyby.json: ${round(END - START)} s (from ${START} s to ${END} s of the orbit), pitch ${camera[0].pitch}° (0100's ${mid.pitch}°), ${camera.length} camera keys, orbit ${ORBIT}° about (${round(pivot[0], 1)}, ${round(pivot[1], 1)}); middle frame from cutscene 1 at ${mid.t} s (distance ${round(Math.hypot(...rel), 1)} m)`);
