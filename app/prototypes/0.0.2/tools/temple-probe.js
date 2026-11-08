// The temple in the landed scene (doc/plans/features/temple.md, pass 1). The game's own mode:
//
//     node tools/probe-01.mjs tools/temple-probe.js --game --query scene=landed --shots .export/temple
//
// About 30 s. The temple loaded and shown, 200 m straight ahead of the ship's centre, turned as the
// ship; its floor at the highest ground under its steps, the steps' bottom under the lowest; no rock
// within its steps and 10 m; its stone collides; the shaft drawn (light-shaft.ts), its point light in
// the shaft's orange (landmarks.ts SHAFT_COLOUR), inside, in the outside's light list. Screenshots: her
// seat, from 60 m ahead of the ship, from 35 m off the temple.
// Runs in the page (probe-01.mjs).

const results = [];
const report = (ok, what, detail) => results.push(`${ok ? 'PASS' : 'FAIL'}  ${what}${detail ? `  (${detail})` : ''}`);
const THREE = w.__THREE;

const shown = await until(() => w.__landmarks()?.shown.get('temple'), 20000);
report(!!shown && shown.object.visible, 'landed: the temple is loaded and shown');
if (!shown) return results;
const t = w.__treadmill();
const shipObject = w.__ship().object;
const shipBox = new THREE.Box3().setFromObject(shipObject);
const centre = shipBox.getCenter(new THREE.Vector3()).setY(0);
const at = shown.object.position.clone().setY(0);
const ahead = new THREE.Vector3(0, 0, 1).transformDirection(shipObject.matrixWorld).setY(0).normalize();
const along = at.clone().sub(centre).dot(ahead);
const across = at.clone().sub(centre).sub(ahead.clone().multiplyScalar(along)).length();
report(Math.abs(along - 200) < 1 && across < 1, '200 m straight ahead of the ship’s centre', `${along.toFixed(1)} m ahead, ${across.toFixed(2)} m off the axis; ahead is (${ahead.x.toFixed(2)}, ${ahead.z.toFixed(2)})`);
const turn = shown.object.quaternion.angleTo(shipObject.getWorldQuaternion(new THREE.Quaternion()));
report(turn < 1e-4, 'turned as the ship (the file’s turn relative to it)', `${THREE.MathUtils.radToDeg(turn).toFixed(3)}°`);

const steps = new THREE.Box3().setFromObject(shown.steps);
let high = -Infinity, low = Infinity;
for (let x = steps.min.x; x <= steps.max.x; x += 0.5) for (let z = steps.min.z; z <= steps.max.z; z += 0.5) {
  const y = t.groundY(x, z);
  high = Math.max(high, y);
  low = Math.min(low, y);
}
report(steps.max.y >= high - 0.05 && steps.min.y < low, 'its floor on the highest ground under the steps, their bottom under the lowest', `floor ${steps.max.y.toFixed(2)}, steps' bottom ${steps.min.y.toFixed(2)}, the ground ${low.toFixed(2)}..${high.toFixed(2)}`);

const v = new THREE.Vector3();
let nearest = Infinity;
for (const rock of t.nearRocks) {
  const p = rock.geometry.getAttribute('position');
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).applyMatrix4(rock.matrixWorld);
    nearest = Math.min(nearest, Math.hypot(v.x - at.x, v.z - at.z));
  }
}
const reach = Math.hypot(steps.max.x - steps.min.x, steps.max.z - steps.min.z) / 2;
report(nearest > reach + 10, 'no rock within its steps and 10 m', `nearest rock ${nearest.toFixed(0)} m from its centre, steps reach ${reach.toFixed(1)} m`);

// The collider (its arches are open): a ray down onto the steps, outside the walls, where the ground
// under them is lowest, stops at the floor, not the ground.
const temple = new THREE.Box3().setFromObject(shown.object.children.find((o) => o.name === 'Temple') ?? shown.object);
const mid = temple.getCenter(new THREE.Vector3());
const right = new THREE.Vector3(-ahead.z, 0, ahead.x);
const inner = (temple.max.x - temple.min.x) / 2;
const outer = (steps.max.x - steps.min.x) / 2;
const spots = [ahead, right, ahead.clone().negate(), right.clone().negate()].map((d) => mid.clone().addScaledVector(d, (inner + outer) / 2));
const spot = spots.sort((a, b) => t.groundY(a.x, a.z) - t.groundY(b.x, b.z))[0];
const hit = w.__physics.ray(spot.clone().setY(steps.max.y + 10), new THREE.Vector3(0, -1, 0), 30);
const under = t.groundY(spot.x, spot.z);
report(hit && Math.abs(steps.max.y + 10 - hit.distance - steps.max.y) < 0.1, 'its stone collides (a ray down onto its steps stops at the floor)', hit ? `stopped at ${(steps.max.y + 10 - hit.distance).toFixed(2)}, the floor ${steps.max.y.toFixed(2)}, the ground under it ${under.toFixed(2)}` : 'nothing hit');

// The shaft (pass 2): the file's box hidden, drawn by light-shaft.ts from its foot on the floor; the
// point light in the Blackbody's colour, in the outside's light list (it lights the stone and the ice).
const drawn = shown.lightShaft;
const light = drawn?.light;
const outside = [];
w.__scene.traverse((o) => o.material?.lightsNode && outside.push(o.material.lightsNode));
const listed = outside.length > 0 && outside[0].getLights().includes(light);
report(!!drawn && drawn.group.visible && !shown.shaft.visible, 'the shaft drawn (core, glow, flare), the file’s box hidden', drawn ? `${drawn.group.children.length} parts` : 'none');
report(!!light && light.color.r === 1 && light.color.g < 1 && light.color.b < light.color.g && light.color.g < 0.6 && light.intensity > 0 && listed, 'the point light: the shaft’s orange, lighting the outside', light ? `colour ${light.color.r.toFixed(2)}, ${light.color.g.toFixed(2)}, ${light.color.b.toFixed(2)}; ${light.intensity} cd; in the outside’s list: ${listed}` : 'none');
report(light && temple.containsPoint(light.position), 'the light inside the temple', light ? `at y ${light.position.y.toFixed(1)}, the temple ${temple.min.y.toFixed(1)}..${temple.max.y.toFixed(1)}` : '');

// Screenshots: her seat; then the camera placed by hand, its own update off, the see-through off.
w.__view.pitch = 0.05;
await wait(3000);
await shot('seat');
w.__settings.seeThrough = false;
const view = w.__view;
view.update = () => {};
const look = (eye, target) => {
  view.camera.position.copy(eye);
  view.camera.lookAt(target);
  view.camera.updateMatrixWorld();
};
// From the cockpit, between the front seats (Blender 0.7, -4.6, 5.0), toward the temple's top.
look(shipObject.localToWorld(new THREE.Vector3(0.7, 5.0, 4.6)), mid.clone().setY(temple.max.y));
await wait(2500);
await shot('cockpit');
const front = centre.clone().addScaledVector(ahead, 60);
look(front.clone().setY(t.groundY(front.x, front.z) + 2), mid.clone().setY(mid.y + 40));
await wait(2500);
await shot('ahead-of-the-ship');
const off = Math.max(25, (temple.max.x - temple.min.x) * 1.6);
const near = mid.clone().addScaledVector(ahead, -off).addScaledVector(right, off * 0.6);
look(near.setY(t.groundY(near.x, near.z) + 2), mid.clone().setY(mid.y + 10));
await wait(2500);
await shot('near-the-temple');
// From its floor, by the steps' edge, looking up the shaft.
const edge = mid.clone().addScaledVector(ahead, -(outer - 2)).setY(steps.max.y + 1.7);
look(edge, mid.clone().setY(steps.max.y + 400));
await wait(2500);
await shot('looking-up');
return results;
