// Where the interaction prompt goes, door by door (item 56, pass 1; plan:
// doc/plans/features/prompt-placement.md). In app/:
//
//     node prototypes/0.0.2/tools/probe-01.mjs prototypes/0.0.2/tools/prompt-places.js --shots .export/prompts
//
// About 40 s. She stands about a metre in front of each target with a handle point (the doors, the
// hatches, the lever), facing it; one screenshot each, and a line: what's targeted, the prompt's
// text, where its handle point and the prompt are on screen. Runs in the page (probe-01.mjs).

const physics = w.__physics, character = w.__character, view = w.__view;
const interaction = w.__interaction();
const prompt = document.querySelector('#prompt');
const DOWN = new T.Vector3(0, -1, 0);
const put = (p) => {
  physics.teleport(p);
  character.position.copy(p);
  character.verticalVelocity = 0;
  character.speed = 0;
  character.velocity.set(0, 0, 0);
};
const onScreen = (p) => {
  const q = p.clone().project(view.camera);
  return `${((q.x * 0.5 + 0.5) * innerWidth).toFixed(0)},${((-q.y * 0.5 + 0.5) * innerHeight).toFixed(0)}`;
};
// A red dot at the handle point, for the screenshots.
const dot = new T.Mesh(new T.SphereGeometry(0.025), new T.MeshBasicMaterial({ color: 0xff0000, depthTest: false }));
dot.renderOrder = 999;
w.__scene.add(dot);
const lines = [];
for (const item of interaction.items.filter((i) => i.anchor)) {
  const box = new T.Box3();
  for (const o of item.objects) box.union(new T.Box3().setFromObject(o));
  const centre = box.getCenter(new T.Vector3());
  const size = box.getSize(new T.Vector3());
  const handle = item.anchor(new T.Vector3());
  // In front of its thinnest side (a door's face), on the side with nothing in the way, on a floor.
  const normal = size.x < size.z ? new T.Vector3(1, 0, 0) : new T.Vector3(0, 0, 1);
  let feet = null;
  for (const sign of [1, -1]) {
    for (const d of [1.0, 0.8, 1.3]) {
      const at = centre.clone().addScaledVector(normal, sign * d);
      if (physics.castRay(centre.clone().addScaledVector(normal, sign * 0.2), at) !== null) continue;
      const hit = physics.ray(at, DOWN, 2.5, true);
      if (!hit) continue;
      feet = at.clone().setY(at.y - hit.distance);
      break;
    }
    if (feet) break;
  }
  if (!feet) {
    lines.push(`${item.name}: no place to stand`);
    continue;
  }
  // A little to one side, so she isn't between the camera and the handle.
  const side = new T.Vector3(-normal.z, 0, normal.x);
  const aside = feet.clone().addScaledVector(side, 0.45);
  const hit = physics.castRay(feet.clone().setY(feet.y + 0.5), aside.clone().setY(feet.y + 0.5)) === null && physics.ray(aside.clone().setY(feet.y + 0.5), DOWN, 1, true);
  if (hit) feet = aside;
  put(feet);
  const dx = centre.x - feet.x, dz = centre.z - feet.z;
  character.facing = Math.atan2(-dx, -dz);
  view.yaw = character.facing + 0.35;
  view.pitch = 0.35;
  await wait(2000);
  item.anchor(dot.position);
  const target = interaction.target;
  lines.push(`${item.name}: target ${target?.name ?? 'none'} "${prompt.hidden ? '' : prompt.textContent}"; handle ${onScreen(handle)}, prompt ${interaction.promptAt.x.toFixed(0)},${interaction.promptAt.y.toFixed(0)}`);
  await shot(item.name.replace(/[^\w]+/g, '-'));
}
w.__scene.remove(dot);
return lines.join('\n');
