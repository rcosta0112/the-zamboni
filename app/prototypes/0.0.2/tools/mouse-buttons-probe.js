// The mouse's buttons (2026-11-18, plan doc/plans/features/mouse-buttons.md): the left button interacts
// only with the mouse captured; E still interacts in dev (the scripts'); holding the right button skips
// a cutscene, the left no longer does; the prompts' mouse icons. In app/prototypes/0.0.2/:
//
//     node tools/probe-01.mjs tools/mouse-buttons-probe.js --shots <folder>
//
// About 40 s. The capture is faked (headless Chrome has none): `document.pointerLockElement` made the
// canvas for the captured clicks. Runs in the page (probe-01.mjs).

const results = [];
const report = (ok, name, detail) => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `: ${detail}` : ''}`);
const physics = w.__physics, character = w.__character, view = w.__view;
const interaction = w.__interaction(), dialogue = w.__dialogue;
const canvas = document.querySelector('canvas');
const prompt = document.querySelector('#prompt');
const captured = (on) => Object.defineProperty(document, 'pointerLockElement', { configurable: true, get: () => (on ? canvas : null) });
const click = async (button = 0) => {
  canvas.dispatchEvent(new MouseEvent('mousedown', { button, bubbles: true }));
  window.dispatchEvent(new MouseEvent('mouseup', { button }));
  await wait(300);
};
const key = async (code) => { window.dispatchEvent(new KeyboardEvent('keydown', { code })); window.dispatchEvent(new KeyboardEvent('keyup', { code })); await wait(300); };
const put = (p) => { physics.teleport(p); character.position.copy(p); character.verticalVelocity = 0; character.speed = 0; character.velocity.set(0, 0, 0); };
const DOWN = new T.Vector3(0, -1, 0);

// Her by the pilot's seat (as seat-probe.js): its remark is a dialogue line.
const root = w.__entity('cockpit-seat-pilot')?.object;
if (!root) return ['FAIL  no seat entity'];
const box = new T.Box3().setFromObject(root);
const centre = box.getCenter(new T.Vector3());
let found = false;
for (let r = 0.2; r < 1.4 && !found; r += 0.1) {
  for (let i = 0; i < 16 && !found; i++) {
    const a = (i / 16) * Math.PI * 2;
    const dir = new T.Vector3(Math.sin(a), 0, Math.cos(a));
    const half = Math.abs(dir.x) * (box.max.x - box.min.x) / 2 + Math.abs(dir.z) * (box.max.z - box.min.z) / 2;
    const at = centre.clone().addScaledVector(dir, half + r); at.y = box.max.y + 0.5;
    const hit = physics.ray(at, DOWN, 3, true);
    if (!hit) continue;
    const spot = at.clone().setY(at.y - hit.distance + 0.02);
    if (spot.y < box.min.y - 0.3 || !physics.fits(spot)) continue;
    put(spot);
    character.facing = Math.atan2(-(centre.x - spot.x), -(centre.z - spot.z));
    view.yaw = character.facing + 0.3; view.pitch = 0.3;
    await wait(400);
    found = interaction.target?.name === root.name;
  }
}
report(found, 'she stands at the seat, its prompt up');
if (!found) return results;
await wait(1200);
// The last device decides the glyph: a mouse move counts as keyboard and mouse.
captured(true);
window.dispatchEvent(new MouseEvent('mousemove', { movementX: 0, movementY: 0 }));
await wait(300);
const icon = prompt.querySelector('.glyph svg')?.getAttribute('aria-label');
report(icon === 'left mouse button', "the prompt's icon is the left button", `${icon ?? prompt.textContent}`);
await shot('mouse-prompt');

captured(false);
await click(0);
report(!dialogue.active, 'a left click without the mouse captured does nothing');

captured(true);
await click(2);
report(!dialogue.active, 'a right click does not interact');
await click(0);
report(dialogue.active, 'a left click with the mouse captured interacts', dialogue.line?.text);
await wait(1500);
const boxIcon = document.querySelector('.glyph.icon svg')?.getAttribute('aria-label');
report(boxIcon === 'left mouse button', "the dialogue box's icon is the left button", boxIcon ?? '(none)');
await shot('mouse-dialogue');
let n = 0; while (dialogue.active && n < 8) { await click(0); n++; }
report(!dialogue.active, 'left clicks move the box on to its end', `${n} clicks`);
await wait(1200);

await key('KeyE');
report(dialogue.active, 'E still interacts in dev (for the scripts)');
n = 0; while (dialogue.active && n < 8) { await key('Enter'); n++; }
await wait(500);

// The skip: a press shows the prompt, the held button fills it (2 s).
const player = w.__cutscene();
await player.play('test-ship-shots');
await until(() => player.time >= 0.5, 5000);
const hold = async (button, ms) => {
  window.dispatchEvent(new MouseEvent('mousedown', { button }));
  await wait(ms);
  window.dispatchEvent(new MouseEvent('mouseup', { button }));
};
await hold(0, 2600);
report(player.playing, 'holding the left button does not skip', `t ${player.time.toFixed(2)}`);
window.dispatchEvent(new MouseEvent('mousedown', { button: 2 }));
await wait(500);
const skipIcon = document.querySelector('#skip .glyph svg')?.getAttribute('aria-label');
report(skipIcon === 'right mouse button', "the skip prompt's icon is the right button", skipIcon ?? '(none)');
await shot('mouse-skip');
await wait(2000);
window.dispatchEvent(new MouseEvent('mouseup', { button: 2 }));
await wait(200);
report(!player.playing, 'holding the right button skips', `t ${player.time.toFixed(2)}`);
delete document.pointerLockElement;
return results;
