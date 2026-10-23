// The scenery going by while the ship flies (the flying scene, pass 4: doc/plans/features/flying-scene.md).
// In app/prototypes/0.0.2/:
//
//     node tools/probe-01.mjs tools/scenery-probe.js --shots .export/scenery
//
// About 40 s. Starts `chapter-1` (the checks' game: no animatic in the way): the terrain shown, the
// landed ground hidden, the ground moving; screenshots through the cockpit windows, then from outside
// (the view camera held still at three places: behind, the side, low), for comparing with the
// reference video's frames; the frame rate over 3 s from outside. Then `landed`: the scenery gone.
// Runs in the page (probe-01.mjs).

const t = w.__treadmill();
const results = [];
const report = (ok, what, detail) => results.push(`${ok ? 'PASS' : 'FAIL'}  ${what}${detail ? `  (${detail})` : ''}`);

await w.__director().start('chapter-1');
await until(() => t.current === 'ice-plain' && t.group.children.length > 1, 10000);
report(t.current === 'ice-plain' && t.group.visible, 'chapter-1 shows the icy plain', `${t.group.children.length} meshes`);
report(!w.__world.floor.visible, 'the landed ground is hidden');
// The outside's own light (doc/plans/features/outside-light.md): every material here uses it; its sun is the game's.
const outsideLights = new Set();
t.group.traverse((o) => o.material && outsideLights.add(o.material.lightsNode));
const lightList = [...outsideLights][0]?.getLights?.() ?? [];
report(outsideLights.size === 1 && !outsideLights.has(null) && lightList.includes(w.__world.sun), "the scenery lit by the outside's lights, with the game's sun", `${outsideLights.size} list, ${lightList.length} lights`);
await wait(2000); // the new shaders' first frames stall
const before = t.travelled;
const t0 = performance.now();
await wait(1000);
const speed = (t.travelled - before) / ((performance.now() - t0) / 1000);
report(Math.abs(speed - w.__settings.flightSpeed) < 5, "the ground goes by at the ship's speed", `${speed.toFixed(1)} m/s`);

w.__view.pitch = 0.05;
await wait(2000);
await shot('cockpit');

// From outside: the camera's own update switched off, the see-through off.
const seeThrough = w.__settings.seeThrough;
w.__settings.seeThrough = false;
const view = w.__view;
const update = view.update;
view.update = () => {};
const box = new T.Box3().setFromObject(w.__ship().object);
const c0 = box.getCenter(new T.Vector3());
// As the fly-by's frames: high above and behind (its start), level beside, low near the ground ahead.
const places = { behind: [10, 6, 35], high: [-60, 85, 70], side: [-30, -2, 5], low: [-35, -14, -70] };
for (const [name, p] of Object.entries(places)) {
  view.camera.position.set(c0.x + p[0], c0.y + p[1], c0.z + p[2]);
  view.camera.lookAt(c0.x, c0.y, c0.z);
  await wait(2000);
  await shot(name);
}
const f0 = performance.now();
let frames = 0;
while (performance.now() - f0 < 3000) {
  await new Promise(requestAnimationFrame);
  frames++;
}
report(frames / 3 > 50, 'the frame rate from outside', `${(frames / 3).toFixed(1)} fps`);
view.update = update;
w.__settings.seeThrough = seeThrough;

await w.__director().start('landed');
await wait(300);
report(!t.group.visible && w.__world.floor.visible && t.current === null, 'landed: the scenery gone, the ground back');
return results;
