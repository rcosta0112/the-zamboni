// The hanger in her locker (item 75; locker outfit plan, pass 3): the parka exported under its
// hanger; *Put on parka* zips and starts a swing about the hook that dies away; *Take off* the same,
// with the other zipper cue. A last swing three times larger, for the screenshots (the hook stays put).
// In app/prototypes/0.0.2/:
//
//     node tools/probe-01.mjs tools/hanger-probe.js --shots .export/hanger
//
// Returns one "PASS …" / "FAIL …" line per check. Runs in the page (probe-01.mjs).

const results = [];
const report = (ok, name, detail) => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `: ${detail}` : ''}`);
const physics = w.__physics, character = w.__character, view = w.__view, interaction = w.__interaction(), clothes = w.__clothes();
const hanger = w.__entity('green-coat-hanger')?.object;
const parka = interaction.items.find((i) => i.objects[0]?.userData.id === 'green-parka');
const door = w.__entity('crew-locker-door-1')?.components[0];
if (!hanger || !parka || !door) return [`FAIL  no hanger (${Boolean(hanger)}), parka target (${Boolean(parka)}) or locker door (${Boolean(door)})`];
const swing = clothes.swings[0];

let under = false;
for (let p = parka.objects[0].parent; p; p = p.parent) if (p === hanger) under = true;
report(clothes.swings.length === 1 && under, 'one hanger; the parka under it', `${clothes.swings.length} swing(s); parka's parent ${parka.objects[0].parent?.name}`);
door.open = true;
await until(() => door.amount === 1, 3000);

// In front of the locker, facing the parka (locker-probe.js's search).
const DOWN = new T.Vector3(0, -1, 0);
const centre = new T.Box3().setFromObject(parka.objects[0]).getCenter(new T.Vector3());
let feet = null;
for (let r = 0.5; r < 1.4 && !feet; r += 0.15) {
  for (let i = 0; i < 16 && !feet; i++) {
    const a = (i / 16) * Math.PI * 2;
    const at = centre.clone().add(new T.Vector3(Math.sin(a) * r, 0, Math.cos(a) * r));
    const hit = physics.ray(at, DOWN, 2.5, true);
    if (!hit) continue;
    const spot = at.clone().setY(at.y - hit.distance + 0.02);
    if (!physics.fits(spot)) continue;
    physics.teleport(spot); character.position.copy(spot); character.verticalVelocity = 0; character.speed = 0; character.velocity.set(0, 0, 0);
    character.facing = Math.atan2(-(centre.x - spot.x), -(centre.z - spot.z));
    view.yaw = character.facing + 0.5; view.pitch = 0.2;
    await wait(300);
    if (interaction.target === parka) feet = spot;
  }
}
report(Boolean(feet), 'she can aim at the parka', feet ? `from ${feet.toArray().map((v) => v.toFixed(2))}` : '');

/** Uses the parka; the swing's angle (degrees) every frame for 2 s. */
async function use() {
  const started = { ...w.__audio.started };
  parka.act();
  const angles = [];
  const until2 = performance.now() + 2000;
  while (performance.now() < until2) {
    angles.push((swing.angle * 180) / Math.PI);
    await new Promise((r) => requestAnimationFrame(r));
  }
  const peak = Math.max(...angles.map(Math.abs));
  const late = Math.max(0, ...angles.slice(Math.floor(angles.length * 0.6)).map(Math.abs));
  let turns = 0;
  for (let i = 1; i < angles.length; i++) if (Math.sign(angles[i]) !== Math.sign(angles[i - 1]) && angles[i] !== 0) turns++;
  const zipped = Object.keys(w.__audio.started).filter((id) => id.startsWith('sfx_zipper') && w.__audio.started[id] !== started[id]);
  return { peak, late, turns, last: angles.at(-1), zipped };
}

const on = await use();
report(w.__settings.outfit === 'parka' && on.peak > 4.5 && on.peak <= 6 && on.turns >= 1 && on.late < 1 && on.last === 0, 'put on: a swing of about 5° that dies away', `peak ${on.peak.toFixed(2)}°, ${on.turns} turns, ${on.late.toFixed(2)}° in the last 40%, ends at ${on.last}`);
report(on.zipped.join() === 'sfx_zipper_up', 'put on: the zipper (up)', on.zipped.join() || '(none)');
const off = await use();
report(w.__settings.outfit === 'jumpsuit' && off.peak > 4.5 && off.last === 0, 'take off: the swing again', `peak ${off.peak.toFixed(2)}°, ends at ${off.last}`);
report(off.zipped.join() === 'sfx_zipper_down', 'take off: the zipper (down)', off.zipped.join() || '(none)');

// For the eye: three times the swing, at rest then at its peak and the other way.
await shot('1-at-rest');
const hookBefore = new T.Box3().setFromObject(hanger).max.y;
w.__settings.hangerSwing = 15;
w.__settings.hangerSwingTime = 30;
w.__settings.hangerSwingRate = 0.25;
swing.start();
await until(() => swing.angle > 0.25, 3000);
await shot('2-swung');
const hookSwung = new T.Box3().setFromObject(hanger).max.y;
await until(() => swing.angle < -0.25, 4000);
await shot('3-swung-back');
w.__settings.hangerSwing = 5; w.__settings.hangerSwingTime = 1.5; w.__settings.hangerSwingRate = 0.8;
report(hookSwung <= hookBefore + 0.01, 'the hook stays put (its top within 1 cm, swung 15°)', `top ${hookBefore.toFixed(3)} → ${hookSwung.toFixed(3)} m`);
return results;
