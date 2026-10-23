// The scenery's cost (the flying scene, pass 4b: doc/plans/features/flying-scene.md). In app/prototypes/0.0.2/,
// with the frame rate uncapped (browser.mjs):
//
//     UNCAPPED=1 node tools/probe-01.mjs tools/flight-perf-probe.js
//
// About 90 s. The frame rate from the same outside camera, landed and then flying (`chapter-1`, the
// scenery with its clouds), 5 s each; then the JS heap while flying, sampled every 5 s for a minute
// (garbage collection makes it saw: what counts is the low points not climbing).
// Runs in the page (probe-01.mjs).

const results = [];
const report = (ok, what, detail) => results.push(`${ok ? 'PASS' : 'FAIL'}  ${what}${detail ? `  (${detail})` : ''}`);
const view = w.__view;
const update = view.update;
const seeThrough = w.__settings.seeThrough;

async function fps(ms) {
  const f0 = performance.now();
  let frames = 0;
  while (performance.now() - f0 < ms) {
    await new Promise(requestAnimationFrame);
    frames++;
  }
  return frames / (ms / 1000);
}
function outside() {
  const box = new T.Box3().setFromObject(w.__ship().object);
  const c0 = box.getCenter(new T.Vector3());
  view.camera.position.set(c0.x - 60, c0.y + 85, c0.z + 70); // the scenery probe's `high`
  view.camera.lookAt(c0.x, c0.y, c0.z);
}

w.__settings.seeThrough = false;
view.update = () => {};
outside();
await wait(3000);
const landed = await fps(5000);

view.update = update;
await w.__director().start('chapter-1');
const t = w.__treadmill();
await until(() => t.current === 'ice-plain' && t.group.children.length > 1, 10000);
view.update = () => {};
outside();
await wait(4000); // the new shaders' first frames stall
const flying = await fps(5000);
results.push(`landed ${landed.toFixed(1)} fps (${(1000 / landed).toFixed(2)} ms), flying ${flying.toFixed(1)} fps (${(1000 / flying).toFixed(2)} ms)`);
report(flying > 50, 'flying from outside, above 50 fps');

const heap = [];
for (let i = 0; i <= 12; i++) {
  heap.push(performance.memory.usedJSHeapSize / 1048576);
  if (i < 12) await wait(5000);
}
results.push(`heap (MB, every 5 s): ${heap.map((h) => h.toFixed(1)).join(' ')}`);
const firstLow = Math.min(...heap.slice(0, 6));
const lastLow = Math.min(...heap.slice(6));
report(lastLow - firstLow < 5, "the heap's low points steady over a minute", `${firstLow.toFixed(1)} → ${lastLow.toFixed(1)} MB`);

view.update = update;
w.__settings.seeThrough = seeThrough;
return results;
