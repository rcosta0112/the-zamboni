// Talking to the crew (the dialogue plan, pass 1: doc/plans/features/dialogue.md). In app/:
//
//     node prototypes/0.0.2/tools/probe-01.mjs prototypes/0.0.2/tools/dialogue-probe.js --shots .export/dialogue
//
// About 40 s. She stands about a metre from each crew member, facing them: the prompt's text; E
// starts the conversation (the box, typing); E completes the line, E goes on or ends it; the camera
// didn't move; a second E right after the end doesn't start it again; the prompt is back a second
// later. Screenshots while typing and when the line is done. Runs in the page (probe-01.mjs).

const physics = w.__physics, character = w.__character, view = w.__view;
const interaction = w.__interaction(), dialogue = w.__dialogue;
const prompt = document.querySelector('#prompt');
const DOWN = new T.Vector3(0, -1, 0);
const put = (p) => {
  physics.teleport(p);
  character.position.copy(p);
  character.verticalVelocity = 0;
  character.speed = 0;
  character.velocity.set(0, 0, 0);
};
const press = async (code = 'KeyE') => {
  window.dispatchEvent(new KeyboardEvent('keydown', { code }));
  window.dispatchEvent(new KeyboardEvent('keyup', { code }));
  await wait(250);
};
const lines = [];
for (const id of ['kaufman', 'ogawa', 'adam-red', 'adam-blue']) {
  const root = w.__entity(id)?.object;
  if (!root) {
    lines.push(`${id}: no entity`);
    continue;
  }
  const box = new T.Box3().setFromObject(root);
  const centre = box.getCenter(new T.Vector3());
  // The nearest floor around them where she fits and they're the target (the cockpit is tight):
  // rings of 16 directions, facing them, the camera a little to one side.
  let feet = null;
  let tried = 0;
  for (let r = 0.3; r < 1.6 && !feet; r += 0.15) {
    for (let i = 0; i < 16 && !feet; i++) {
      const a = (i / 16) * Math.PI * 2;
      const dir = new T.Vector3(Math.sin(a), 0, Math.cos(a));
      const half = Math.abs(dir.x) * (box.max.x - box.min.x) / 2 + Math.abs(dir.z) * (box.max.z - box.min.z) / 2;
      const at = centre.clone().addScaledVector(dir, half + r);
      at.y = box.min.y + 1.0;
      const hit = physics.ray(at, DOWN, 2.5, true);
      if (!hit || hit.distance < 0.3 || Math.abs(at.y - hit.distance - box.min.y) > 1.0) continue;
      const spot = at.clone().setY(at.y - hit.distance + 0.02);
      if (!physics.fits(spot)) continue;
      put(spot);
      character.facing = Math.atan2(-(centre.x - spot.x), -(centre.z - spot.z));
      view.yaw = character.facing + 0.3;
      view.pitch = 0.3;
      tried++;
      await wait(400);
      if (interaction.target?.name === root.name) feet = spot;
    }
  }
  if (!feet) {
    lines.push(`${id}: not the target from any of ${tried} places tried`);
    continue;
  }
  await wait(1600);
  const said = prompt.hidden ? '(no prompt)' : prompt.textContent;
  const camera = view.camera.position.clone();
  await press();
  await wait(300); // the conversation starts once the click has finished (0.17 s), then the debounce
  const started = dialogue.active;
  const first = dialogue.line;
  await shot(`${id}-typing`);
  await press(); // completes the line
  const completed = dialogue.line?.done ?? false;
  await shot(`${id}-done`);
  let presses = 0;
  while (dialogue.active && presses < 40) {
    await press();
    presses++;
  }
  const moved = view.camera.position.distanceTo(camera);
  await press(); // right after the end: not again
  const again = dialogue.active;
  await wait(1200);
  const back = !prompt.hidden && prompt.textContent;
  lines.push(`${id}: prompt "${said}"; started ${started} ("${first?.speaker}: ${first?.text.slice(0, 30)}…"), completed by a press ${completed}, ended after ${presses} more; camera moved ${moved.toFixed(3)} m; started again ${again}; prompt back "${back}"`);
}
return lines.join('\n');
