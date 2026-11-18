// Draw calls per view, the pipelines and the ship's shader compile (the optimisation plan, SC-180,
// step 2's pass 2: doc/plans/features/palette-material.md). In app/:
//
//     npm run probe -- tools/draw-calls-probe.js --reload tools/draw-calls-probe.js
//     ... --query ship=<name>     (an older export in .export/<name>.glb, dev builds only)
//     ... --query merge=0         (the static meshes not merged per room, merge-rooms.ts)
//
// The first run is a cold load (the probe's fresh profile), the reload a warm one. For each room
// (her in its aisle, as see-through-views.js does) and from outside the ship: the draw calls per
// frame, averaged over 30 frames. Runs in the page (probe-01.mjs).

const physics = w.__physics, character = w.__character, view = w.__view, settings = w.__settings;
const renderer = w.__renderer;
const DOWN = new T.Vector3(0, -1, 0);
const centre = ship.interior.getCenter(new T.Vector3());
const put = (p) => {
  physics.teleport(p);
  character.position.copy(p);
  character.verticalVelocity = 0;
  character.speed = 0;
  character.velocity.set(0, 0, 0);
};
async function calls() {
  const info = renderer.info;
  const auto = info.autoReset;
  info.autoReset = false;
  info.reset();
  const frames = 30;
  for (let i = 0; i < frames; i++) await new Promise(requestAnimationFrame);
  const perFrame = info.render.drawCalls / frames;
  const triangles = info.render.triangles / frames;
  info.autoReset = auto;
  return `${Math.round(perFrame)} calls, ${Math.round(triangles / 1000)}k tris`;
}

const out = {
  ship: new URLSearchParams(location.search).get('ship') ?? 'current',
  compileMs: w.__shipCompiledIn,
  mergeMs: ship.mergedInMs,
  sinceNavigation: Math.round(performance.now()),
  pipelines: renderer._pipelines?.caches?.size,
  programs: renderer._pipelines ? `${renderer._pipelines.programs.vertex.size} vertex, ${renderer._pipelines.programs.fragment.size} fragment` : null,
  views: {},
};

out.views.start = await calls();
const rooms = [
  ['cargo', 'Pallet', 0],
  ['engineering', 'Contraption', 0],
  ['crew-quarters', 'Table', 1],
  ['cockpit', 'Seat001', 1],
];
const views = [
  ['a', 0.8, 0.7],
  ['b', 0.8 + Math.PI, 0.7],
  ['low', 0.8, 0.15],
];
for (const [room, object, deck] of rooms) {
  const target = ship.object.getObjectByName(object) ?? ship.cutUnits.find((u) => u.object.parent?.name === object)?.object;
  if (!target) {
    out.views[room] = `no "${object}"`;
    continue;
  }
  const at = new T.Box3().setFromObject(target).getCenter(new T.Vector3());
  let feet = null;
  for (const dx of [0, 0.7, -0.7, 1.2, -1.2]) {
    const from = new T.Vector3(centre.x + dx, (deck ? ship.upperFloorY : ship.interior.min.y + 0.3) + 0.4, at.z);
    const hit = physics.ray(from, DOWN, 1.5, true);
    if (hit && hit.distance > 0.05 && (!feet || from.y - hit.distance < feet.y)) feet = from.clone().setY(from.y - hit.distance);
  }
  if (!feet) {
    out.views[room] = 'no floor found';
    continue;
  }
  put(feet);
  for (const [name, yaw, pitch] of views) {
    view.yaw = yaw;
    view.pitch = pitch;
    await wait(1500);
    out.views[`${room}-${name}`] = await calls();
  }
}

// From outside (flight-perf-probe.js's `high`), the see-through off.
const seeThrough = settings.seeThrough;
const update = view.update;
settings.seeThrough = false;
view.update = () => {};
const box = new T.Box3().setFromObject(ship.object);
const c0 = box.getCenter(new T.Vector3());
view.camera.position.set(c0.x - 60, c0.y + 85, c0.z + 70);
view.camera.lookAt(c0);
await wait(2000);
out.views['outside-high'] = await calls();
view.camera.position.set(c0.x + 25, c0.y + 2, c0.z + 25);
view.camera.lookAt(c0);
await wait(2000);
out.views['outside-near'] = await calls();
view.update = update;
settings.seeThrough = seeThrough;
out.pipelinesAfter = renderer._pipelines?.caches?.size;
return out;
