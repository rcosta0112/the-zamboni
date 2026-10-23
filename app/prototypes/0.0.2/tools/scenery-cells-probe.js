// The scenery round the camera (doc/plans/features/scenery-around-camera.md): the rocks made from
// their cells' places, shown round the camera being drawn. In app/prototypes/0.0.2/:
//
//     npm run probe -- tools/scenery-cells-probe.js
//
// About 25 s. `chapter-1`, the view camera held still: about the density's count; every rock within
// `reach` of the camera; from a camera 2 km away, every rock both should see is in the same place;
// flying on, a rock is where it was moved back by the distance flown.
// Runs in the page (probe-01.mjs).

const t = w.__treadmill(), view = w.__view, settings = w.__settings;
const results = [];
const report = (ok, what, detail) => results.push(`${ok ? 'PASS' : 'FAIL'}  ${what}${detail ? `  (${detail})` : ''}`);

await w.__director().start('chapter-1');
await until(() => t.current === 'ice-plain' && t.group.children.length > 1, 10000);
await wait(2000); // the new shaders' first frames stall
const pool = t.pools.find((p) => p.rocks);
const d = pool.data;

/** Every rock shown, in the group: `x z` to the centimetre, from each shape's matrices (not the shadows'). */
function rocks() {
  const found = new Map();
  pool.meshes.forEach((mesh, v) => {
    const a = mesh.instanceMatrix.array;
    for (let i = 0; i < mesh.count; i++) found.set(`${v} ${a[i * 16 + 12].toFixed(2)} ${a[i * 16 + 14].toFixed(2)}`, [a[i * 16 + 12], a[i * 16 + 14]]);
  });
  return found;
}
const frame = () => new Promise(requestAnimationFrame);

// The camera held, the ground stopped.
const speed = settings.flightSpeed;
const update = view.update;
view.update = () => {};
settings.flightSpeed = 0;
const box = new T.Box3().setFromObject(w.__ship().object);
const c0 = box.getCenter(new T.Vector3());
const place = async (dx) => {
  view.camera.position.set(c0.x + dx, c0.y + 10, c0.z);
  view.camera.lookAt(c0.x + dx, c0.y, c0.z - 50);
  await frame();
  await frame();
  return { seen: rocks(), eye: t.eye.value.clone() };
};

const a = await place(0);
const expected = pool.density * Math.PI * d.reach ** 2;
report(Math.abs(a.seen.size - expected) < expected * 0.25, 'about as many rocks as the density gives', `${a.seen.size}; ${expected.toFixed(0)} expected`);
const far = [...a.seen.values()].filter(([x, z]) => Math.hypot(x - a.eye.x, z - a.eye.z) > d.reach);
report(far.length === 0, 'every rock within reach of the camera', `${far.length} outside ${d.reach} m`);

// 2 km to the side: what both squares hold, safely inside each, must match.
const b = await place(2000);
const inside = (eye, [x, z]) => Math.hypot(x - eye.x, z - eye.z) < d.reach - 1;
const shared = [...a.seen.entries()].filter(([, p]) => inside(a.eye, p) && inside(b.eye, p));
const missing = shared.filter(([key]) => !b.seen.has(key));
report(shared.length > 50 && missing.length === 0, 'from a camera 2 km away, the same rocks in the same places', `${shared.length} in both, ${missing.length} missing`);

// Flying on: a rock near the camera, moved back by the distance flown.
await place(0);
const [key0, p0] = [...rocks().entries()].find(([, p]) => inside(t.eye.value, p) && Math.abs(p[1] - t.eye.value.z) < 500);
const v0 = key0.split(' ')[0];
const before = t.travelled;
settings.flightSpeed = speed;
await wait(1000);
settings.flightSpeed = 0;
await frame();
const flown = t.travelled - before;
const moved = [...rocks().entries()].some(([key, p]) => key.split(' ')[0] === v0 && Math.abs(p[0] - p0[0]) < 0.01 && Math.abs(p[1] - (p0[1] + flown)) < 0.05);
report(moved, 'flying on, a rock moves back by the distance flown', `${flown.toFixed(1)} m`);

settings.flightSpeed = speed;
view.update = update;
await w.__director().start('landed');
return results;
