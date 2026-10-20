// Writes the placeholder cutscene `test-ship-shots` (public/test/cutscenes/test-ship-shots.json): three
// shots, 9 s (owner, 2026-10-20). 1: the ship far off, the camera circling it slowly to the right, at the
// same distance, looking at it (owner, 2026-10-20); 2: the cockpit
// from just outside the nose, held still; 3: back to the first shot, picking up where it ended. Every
// place is in the ship file's Blender coordinates (the nose toward -Y). In 0.0.2: `node tools/test-cutscene.mjs`.
// Plan: doc/plans/architecture/game-architecture/game-structure.md (*Pass 5's cutscene*)

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'public/test/cutscenes/test-ship-shots.json');

/** The orbit: degrees a second around the ship, the camera moving to its right. */
const ORBIT = 2;
/** Keys this far apart (s): the player eases linearly between them, so the circle is drawn by many. */
const KEY_STEP = 0.25;
/** Far off: where the camera stands at the cut between shots 1 and 3, and the point of the ship it circles and looks at. */
const FAR_AT = [-60, -50, 2];
const SHIP_MIDDLE = [0, 0, 3];
const DEG = Math.PI / 180;
const radius = Math.hypot(FAR_AT[0] - SHIP_MIDDLE[0], FAR_AT[1] - SHIP_MIDDLE[1]);
const startAngle = Math.atan2(FAR_AT[1] - SHIP_MIDDLE[1], FAR_AT[0] - SHIP_MIDDLE[0]) / DEG;
const farPitch = Math.atan2(SHIP_MIDDLE[2] - FAR_AT[2], radius) / DEG;
/** The six seconds of orbit (shots 1 and 3) centred on FAR_AT; `orbited` is seconds into them. */
const far = (t, orbited) => {
  const angle = (startAngle + ORBIT * (orbited - 3)) * DEG;
  const at = [SHIP_MIDDLE[0] + radius * Math.cos(angle), SHIP_MIDDLE[1] + radius * Math.sin(angle), FAR_AT[2]].map((n) => +n.toFixed(3));
  return { t, at, heading: +(angle / DEG + 180).toFixed(3), pitch: +farPitch.toFixed(2), fov: 35 };
};
const farKeys = (from, orbitedFrom) => Array.from({ length: 3 / KEY_STEP + 1 }, (_, i) => far(from + i * KEY_STEP, orbitedFrom + i * KEY_STEP));

/** The cockpit: the pilot seats at y -3.5 (x ±0.8), the navigation and signal stations at y -1.2 to -2 (x ±1.45). */
const NOSE_AT = [0, -6.6, 5.0];
const NOSE_LOOK = [0, -2.2, 4.3];
const nosePitch = Math.atan2(NOSE_LOOK[2] - NOSE_AT[2], Math.hypot(NOSE_LOOK[0] - NOSE_AT[0], NOSE_LOOK[1] - NOSE_AT[1])) / DEG;
const nose = (t) => ({ t, at: NOSE_AT, heading: 90, pitch: +nosePitch.toFixed(2), fov: 50 });

const track = {
  id: 'test-ship-shots',
  duration: 9,
  shots: [
    { start: 0, camera: farKeys(0, 0), far: 300, seeThrough: 'off' },
    { start: 3, camera: [nose(3)], seeThrough: 'off' },
    { start: 6, camera: farKeys(6, 3), far: 300, seeThrough: 'off' },
  ],
  events: [],
  end: [],
};

writeFileSync(out, JSON.stringify(track, null, 1) + '\n');
console.log(`test-ship-shots → ${out}`);
