// The binoculars, pass 1 (doc/plans/features/gadgets-binoculars.md): B and the pad's D-pad up bring
// them out into her hands (the clip's first frame); the right mouse button and the pad's R raise them
// to her eyes and lower them back (owner, 2026-11-16); in third person, on her upper body only.
//
//     node tools/probe-01.mjs tools/binoculars-probe.js --shots .export/binoculars
//
// About 45 s, outside on the plain (`?test` starts in `landed`). Away at first (hidden); B: in her
// hands, not raised, shown; she walks with them held; the right button raises them within the clip's
// length, at her eyes where the file has them; she walks, runs and jumps with them up (the hand's
// offset from the head kept); the pad's R lowers them back to her hands (still out); B puts them away
// (hidden); the pad's D-pad up brings them out; R with nothing out does nothing; a cutscene puts them
// away at once. Screenshots from in front of her: held, walking held, up, walking/running/jumping up.
// Runs in the page (probe-01.mjs).

const results = [];
const report = (ok, what, detail) => results.push(`${ok ? 'PASS' : 'FAIL'}  ${what}${detail ? `  (${detail})` : ''}`);
const THREE = w.__THREE;
const character = w.__character;
const gadgets = w.__gadgets;
const view = w.__view;
const model = character.model;
const bone = (n) => model.object.getObjectByName(n);
const binoculars = bone('Binoculars001') ?? bone('Binoculars.001');
const hand = bone('Hand_r');
const head = bone('Head');
const at = (o) => o.getWorldPosition(new THREE.Vector3());
const key = (code, down) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code }));
const tap = async (code) => { key(code, true); await wait(60); key(code, false); };
const rightClick = async () => { window.dispatchEvent(new MouseEvent('mousedown', { button: 2 })); await wait(60); window.dispatchEvent(new MouseEvent('mouseup', { button: 2 })); };
// A made-up pad: a button down for a few frames, then up.
const buttons = Array.from({ length: 17 }, () => ({ pressed: false, value: 0 }));
const pad = { id: 'probe pad', connected: true, axes: [0, 0, 0, 0], buttons, index: 0, mapping: 'standard', timestamp: 0 };
const realPads = navigator.getGamepads.bind(navigator);
const padTap = async (i) => {
  navigator.getGamepads = () => [pad];
  buttons[i] = { pressed: true, value: 1 };
  await wait(100);
  buttons[i] = { pressed: false, value: 0 };
  await wait(100);
  navigator.getGamepads = realPads;
};
const inHead = () => {
  head.updateWorldMatrix(true, false);
  return at(binoculars).applyMatrix4(head.matrixWorld.clone().invert());
};
const fmt = (v) => `(${v.toArray().map((x) => x.toFixed(3))})`;

report(!!binoculars && !!hand && !!head, 'her model has the binoculars, Hand_r and Head', binoculars ? `binoculars on ${binoculars.parent?.name}` : 'no binoculars');
if (!binoculars) return results;
report(model.gadgetSeconds > 0.3 && model.gadgetSeconds < 1, 'the clip is about half a second', `${model.gadgetSeconds.toFixed(3)} s`);

// Outside, 25 m ahead of the ship's nose.
const s = w.__ship();
const t = w.__treadmill();
const spot = s.object.localToWorld(new THREE.Vector3(14, 0, 30));
const ground = t.groundY(spot.x, spot.z);
w.__physics.teleport(spot.clone().setY(ground + 0.3));
character.position.copy(spot).setY(ground + 0.3);
character.verticalVelocity = 0;
await until(() => character.grounded, 4000);
// Facing away from the camera, then the camera turned round to her front.
const front = async () => {
  key('KeyW', true); await wait(500); key('KeyW', false); await wait(800);
  view.yaw += Math.PI;
  view.pitch = (10 * Math.PI) / 180;
  await wait(800);
};
await front();
report(gadgets.held === 0 && !binoculars.visible, 'away at first: hidden', `held ${gadgets.held}, visible ${binoculars.visible}`);

// B: out, in her hands (the clip's first frame), not raised.
await tap('KeyB');
await until(() => gadgets.held === 1, 2000);
await wait(300);
const handsAt = inHead();
report(binoculars.visible && gadgets.raised === 0 && at(binoculars).distanceTo(at(hand)) < 0.3, 'B: out, in her hands, not raised', `held ${gadgets.held}, raised ${gadgets.raised}; ${at(binoculars).distanceTo(at(hand)).toFixed(3)} m from Hand_r; in the head's frame ${fmt(handsAt)}`);
await shot('1-held');
key('KeyW', true); key('ShiftLeft', true);
await wait(1200);
await shot('2-walking-held');
key('KeyW', false); key('ShiftLeft', false);
await wait(600);
report(gadgets.raised === 0 && gadgets.held === 1, 'held in her hands while she walks', `raised ${gadgets.raised}`);

// The right mouse button: raised to her eyes within the clip's length.
await front();
const t0 = performance.now();
await rightClick();
await until(() => gadgets.up, 2000);
const took = (performance.now() - t0) / 1000;
report(gadgets.up && took < model.gadgetSeconds + 0.3, 'the right mouse button raises them within the clip’s length', `${took.toFixed(2)} s`);
await wait(300);
// Where the file has them at the clip's last frame, in the head bone's frame (measured in Blender 2026-11-16).
const FILE_IN_HEAD = new THREE.Vector3(0, 0.189, 0.304);
const up = inHead();
report(up.distanceTo(FILE_IN_HEAD) < 0.01, 'up at her eyes, where the file has them (head’s frame)', `${fmt(up)} against the file’s (0, 0.189, 0.304)`);
const offset = () => at(hand).sub(at(head)).length();
const heldOffset = offset();
await shot('3-up');

// Walking (Shift), then running, then a jump while running: her legs move, the hold stays.
key('KeyW', true); key('ShiftLeft', true);
await wait(1200);
const walkOffset = offset();
await shot('4-walking-up');
key('ShiftLeft', false);
await wait(1200);
const runOffset = offset();
await shot('5-running-up');
await tap('KeyC');
await until(() => !character.grounded, 1000);
await wait(150);
const airborne = !character.grounded;
const jumpOffset = offset();
await shot('6-jumping-up');
key('KeyW', false);
await until(() => character.grounded, 3000);
report(gadgets.up && airborne, 'still up after walking, running and a jump', `jumped: ${airborne}`);
const drift = Math.max(...[walkOffset, runOffset, jumpOffset].map((o) => Math.abs(o - heldOffset)));
report(drift < 0.03, 'the hold kept over the walk, run and jump (hand to head)', `held ${heldOffset.toFixed(3)} m; walking ${walkOffset.toFixed(3)}, running ${runOffset.toFixed(3)}, jumping ${jumpOffset.toFixed(3)}`);

// The pad's R: lowered back to her hands, still out.
await wait(500);
await padTap(5);
await until(() => gadgets.raised === 0, 2000);
await wait(200);
report(gadgets.raised === 0 && gadgets.held === 1 && binoculars.visible && inHead().distanceTo(handsAt) < 0.01, 'the pad’s R lowers them back to her hands, still out', `in the head's frame ${fmt(inHead())}`);

// B: away, hidden.
await tap('KeyB');
await until(() => gadgets.held === 0, 2000);
await wait(100);
report(gadgets.held === 0 && !binoculars.visible, 'B puts them away: hidden');

// R with nothing out does nothing; the pad's D-pad up brings them out.
await padTap(5);
await wait(300);
report(gadgets.held === 0 && gadgets.raised === 0, 'R with nothing out does nothing');
await padTap(12);
await until(() => gadgets.held === 1, 2000);
report(gadgets.held === 1 && gadgets.raised === 0, 'the pad’s D-pad up brings them out into her hands');

// A cutscene: away at once.
const cutscene = w.__cutscene();
if (cutscene) {
  await cutscene.play('test-ship-shots');
  await wait(200);
  report(gadgets.held === 0 && !binoculars.visible, 'a cutscene puts them away at once', `held ${gadgets.held}`);
  cutscene.skip();
}
return results;
