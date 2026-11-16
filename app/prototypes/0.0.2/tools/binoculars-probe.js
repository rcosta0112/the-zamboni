// The binoculars, passes 1 and 2 (doc/plans/features/gadgets-binoculars.md): 1 (B before 2026-11-16) and the pad's D-pad up
// bring them out into her hands (the clip's first frame); the right mouse button and the pad's R1 raise
// them to her eyes, then first person through them, L1 / L2 and the wheel zooming; R1 again lowers them
// back to her hands, the camera cut back at once (owner, 2026-11-16).
//
//     node tools/probe-01.mjs tools/binoculars-probe.js --shots .export/binoculars
//
// About 60 s, outside on the plain (`?test` starts in `landed`). Away at first (hidden); B: in her
// hands, not raised; held over a walk, a run and a jump (the hand's offset from the head kept); the
// right button raises them within the clip's length, at her eyes where the file has them, then first
// person: the camera at the binoculars, her hidden, the widest lens, no prompt; she walks the way she looks, runs and jumps;
// the view turns her; L1 zooms to the narrowest and stops there, L2 back to the widest, a wheel notch
// in; the panel's range followed; the pad's R1: back to third person at once, the orbit's lens, lowered
// to her hands; B away; R1 with nothing out does nothing; D-pad up; a cutscene puts them away at once.
// The shoulder icons 22 px tall; hovering with the jetpack, first person, the jet off and on again,
// closing leaves her flying. Screenshots: held, walking/running/jumping held, first person at the widest and the narrowest.
// Runs in the page (probe-01.mjs).

const results = [];
const report = (ok, what, detail) => results.push(`${ok ? 'PASS' : 'FAIL'}  ${what}${detail ? `  (${detail})` : ''}`);
const THREE = w.__THREE;
const character = w.__character;
const gadgets = w.__gadgets;
const view = w.__view;
const settings = w.__settings;
const model = character.model;
const bone = (n) => model.object.getObjectByName(n);
const binoculars = bone('Binoculars001') ?? bone('Binoculars.001');
const hand = bone('Hand_r');
const head = bone('Head');
const at = (o) => o.getWorldPosition(new THREE.Vector3());
const key = (code, down) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code }));
const tap = async (code) => { key(code, true); await wait(60); key(code, false); };
const rightClick = async () => { window.dispatchEvent(new MouseEvent('mousedown', { button: 2 })); await wait(60); window.dispatchEvent(new MouseEvent('mouseup', { button: 2 })); };
// A made-up pad: buttons held for a while, then let go.
const buttons = Array.from({ length: 17 }, () => ({ pressed: false, value: 0 }));
const pad = { id: 'probe pad', connected: true, axes: [0, 0, 0, 0], buttons, index: 0, mapping: 'standard', timestamp: 0 };
const realPads = navigator.getGamepads.bind(navigator);
const padHold = async (i, ms) => {
  navigator.getGamepads = () => [pad];
  buttons[i] = { pressed: true, value: 1 };
  await wait(ms);
  buttons[i] = { pressed: false, value: 0 };
  await wait(100);
  navigator.getGamepads = realPads;
};
const padTap = (i) => padHold(i, 100);
const inHead = () => {
  head.updateWorldMatrix(true, false);
  return at(binoculars).applyMatrix4(head.matrixWorld.clone().invert());
};
const fmt = (v) => `(${v.toArray().map((x) => x.toFixed(3))})`;
// The corner's prompts, each pill's text (the icons' names included), joined with ' | '; null when hidden.
const gadgetPrompt = () => { const el = document.querySelector('#gadget-prompt'); return el && !el.hidden && getComputedStyle(el).display !== 'none' ? [...el.querySelectorAll('.pill')].map((p) => p.textContent.replace(/\s+/g, ' ').trim()).join(' | ') : null; };
const lensFor = (zoom) => THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(view.baseFov / 2)) / zoom));

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
await tap('Digit1');
await until(() => gadgets.held === 1, 2000);
await wait(300);
const handsAt = inHead();
report(binoculars.visible && gadgets.raised === 0 && at(binoculars).distanceTo(at(hand)) < 0.3, 'B: out, in her hands, not raised', `held ${gadgets.held}, raised ${gadgets.raised}; ${at(binoculars).distanceTo(at(hand)).toFixed(3)} m from Hand_r; in the head's frame ${fmt(handsAt)}`);
report(w.__binocularView.prompt === 'use' && gadgetPrompt() === 'to Use', 'out: the prompt “R1 to Use” at the bottom right (the mouse’s right button on the keyboard)', `shown: ${JSON.stringify(gadgetPrompt())}`);
await shot('1-held');

// Walking (Shift), then running, then a jump while running, with them in her hands: the hold stays.
const offset = () => at(hand).sub(at(head)).length();
const heldOffset = offset();
key('KeyW', true); key('ShiftLeft', true);
await wait(1200);
const walkOffset = offset();
await shot('2-walking-held');
key('ShiftLeft', false);
await wait(1200);
const runOffset = offset();
await shot('3-running-held');
await tap('KeyC');
await until(() => !character.grounded, 1000);
await wait(150);
const airborne = !character.grounded;
const jumpOffset = offset();
await shot('4-jumping-held');
key('KeyW', false);
await until(() => character.grounded, 3000);
report(gadgets.held === 1 && gadgets.raised === 0 && airborne, 'held in her hands over a walk, a run and a jump', `jumped: ${airborne}`);
const drift = Math.max(...[walkOffset, runOffset, jumpOffset].map((o) => Math.abs(o - heldOffset)));
report(drift < 0.03, 'the hold kept over the walk, run and jump (hand to head)', `held ${heldOffset.toFixed(3)} m; walking ${walkOffset.toFixed(3)}, running ${runOffset.toFixed(3)}, jumping ${jumpOffset.toFixed(3)}`);

// Facing the ship, then the right mouse button: raised to her eyes, then first person.
await wait(600);
const shipAt = new THREE.Box3().setFromObject(s.object).getCenter(new THREE.Vector3());
const toShip = shipAt.clone().sub(character.root.position);
view.yaw = Math.atan2(-toShip.x, -toShip.z);
view.pitch = 0;
await wait(800);
const t0 = performance.now();
await rightClick();
await until(() => gadgets.up, 2000);
const took = (performance.now() - t0) / 1000;
await wait(400);
report(gadgets.up && took < model.gadgetSeconds + 0.3, 'the right mouse button raises them within the clip’s length', `${took.toFixed(2)} s`);
const FILE_IN_HEAD = new THREE.Vector3(0, 0.189, 0.304); // the file's last frame, in the head bone's frame (Blender, 2026-11-16)
report(inHead().distanceTo(FILE_IN_HEAD) < 0.01, 'up at her eyes, where the file has them (head’s frame)', `${fmt(inHead())} against the file’s (0, 0.189, 0.304)`);
const camGap = view.camera.position.distanceTo(at(binoculars));
report(gadgets.firstPerson && camGap < 0.05, 'first person: the camera at the binoculars', `${camGap.toFixed(3)} m`);
const hidden = model.fading.every((f) => f.material.opacity === 0);
report(hidden, 'she is hidden');
report(Math.abs(view.camera.fov - lensFor(settings.binocularZoomMin)) < 0.05, 'the widest lens to start with', `fov ${view.camera.fov.toFixed(2)}°, ${settings.binocularZoomMin}× → ${lensFor(settings.binocularZoomMin).toFixed(2)}°`);
const prompt = document.querySelector('#prompt');
report(!prompt || prompt.hidden || getComputedStyle(prompt).display === 'none' || prompt.style.opacity === '0', 'no interaction prompt');
report(w.__binocularView.prompt === 'zoom' && gadgetPrompt() === 'to Close | to Zoom', 'first person: two prompts, “R1 to Close” over “L1 / L2 to Zoom” (the mouse’s right button and wheel on the keyboard)', `shown: ${JSON.stringify(gadgetPrompt())}`);
report(!document.querySelector('#binocular-overlay'), 'no overlay');
await shot('5-first-person-widest');

// Standing, the view turned: she turns with it.
view.yaw += 0.5;
await wait(300);
const facingGap = Math.abs(Math.atan2(Math.sin(view.yaw - character.facing), Math.cos(view.yaw - character.facing)));
report(facingGap < 0.02, 'she turns with the view', `${THREE.MathUtils.radToDeg(facingGap).toFixed(2)}° apart`);
view.yaw -= 0.5;
await wait(300);

// She still walks, runs and jumps in first person (owner, 2026-11-16), forward being where she looks.
const before = character.root.position.clone();
const lookFlat = view.camera.getWorldDirection(new THREE.Vector3()).setY(0).normalize();
key('KeyW', true); key('ShiftLeft', true); await wait(800); key('ShiftLeft', false);
const walked = character.root.position.clone().sub(before);
await wait(800);
const ran = character.movedSpeed;
await tap('KeyC');
await until(() => !character.grounded, 1000);
const jumped = !character.grounded;
key('KeyW', false);
await until(() => character.grounded, 3000);
report(walked.length() > 0.3 && walked.clone().setY(0).normalize().dot(lookFlat) > 0.9, 'first person: W walks her the way she looks', `${walked.length().toFixed(2)} m, along the view ${walked.clone().setY(0).normalize().dot(lookFlat).toFixed(3)}`);
report(ran > settings.walkSpeed + 0.5 && jumped && gadgets.firstPerson, 'first person: she runs and jumps, still looking through them', `speed ${ran.toFixed(2)} m/s, jumped ${jumped}, first person ${gadgets.firstPerson}`);
// Back where she was, facing the ship, for the zoom's screenshots.
w.__physics.teleport(before); character.position.copy(before); character.verticalVelocity = 0;
await wait(600);

// R2 held: in to the narrowest, and no further; L2 held: back out to the widest; a wheel notch: in.
// The zoom sound (owner, 2026-11-16): the motor while it moves in, reversed while it moves out, cut when it stops.
const zoomSounds = () => w.__audio.playing().filter((id) => id.startsWith('sfx_binoculars_zoom'));
const holdingIn = padHold(4, 2500);
await wait(500);
const whileIn = zoomSounds();
await holdingIn;
report(whileIn.length === 1 && whileIn[0].startsWith('sfx_binoculars_zoom_in'), 'zooming in: the zoom-in sound', `playing ${JSON.stringify(whileIn)}`);
report(zoomSounds().length === 0, 'at the narrowest: the sound stopped', `playing ${JSON.stringify(zoomSounds())}`);
report(gadgetPrompt()?.replace(/ /g, '') === 'R1toClose|L1/L2toZoom', 'on the pad: the R1 icon to Close, the L1 / L2 icons to Zoom', `shown: ${JSON.stringify(gadgetPrompt())}`);
const narrow = w.__binocularView?.zoom;
report(Math.abs(view.camera.fov - lensFor(settings.binocularZoomMax)) < 0.05, 'L1 held: in to the narrowest, and no further', `fov ${view.camera.fov.toFixed(2)}°, ${settings.binocularZoomMax}× → ${lensFor(settings.binocularZoomMax).toFixed(2)}°`);
await shot('6-first-person-narrowest');
const holdingOut = padHold(6, 2500);
await wait(500);
const whileOut = zoomSounds();
await holdingOut;
report(whileOut.length === 1 && whileOut[0].startsWith('sfx_binoculars_zoom_out'), 'zooming out: the zoom-out sound', `playing ${JSON.stringify(whileOut)}`);
report(Math.abs(view.camera.fov - lensFor(settings.binocularZoomMin)) < 0.05, 'L2 held: back out to the widest', `fov ${view.camera.fov.toFixed(2)}°`);
window.dispatchEvent(new WheelEvent('wheel', { deltaY: -100 }));
await wait(200);
report(zoomSounds().length === 0, 'a wheel notch: its sound over after 0.2 s', `playing ${JSON.stringify(zoomSounds())}`);
report(Math.abs(view.camera.fov - lensFor(settings.binocularZoomMin * 1.25)) < 0.05, 'a wheel notch up: in by a step', `fov ${view.camera.fov.toFixed(2)}°`);
// The panel's range is followed.
settings.binocularZoomMax = 4;
await padHold(4, 1500);
report(Math.abs(view.camera.fov - lensFor(4)) < 0.05, 'the panel’s narrowest followed', `fov ${view.camera.fov.toFixed(2)}° against ${lensFor(4).toFixed(2)}°`);
settings.binocularZoomMax = 10;

// The pad's R: back to third person at once, lowered to her hands, still out.
await padTap(5);
await wait(50);
report(!gadgets.firstPerson && view.camera.fov === view.baseFov, 'R1 again: third person at once, the orbit’s lens', `fov ${view.camera.fov}`);
await until(() => gadgets.raised === 0, 2000);
await wait(300);
report(gadgets.raised === 0 && gadgets.held === 1 && binoculars.visible && inHead().distanceTo(handsAt) < 0.01, 'lowered back to her hands, still out', `in the head's frame ${fmt(inHead())}`);
report(gadgetPrompt()?.replace(/ /g, '') === 'R1toUse', 'on the pad, out: the R1 icon, to Use', `shown: ${JSON.stringify(gadgetPrompt())}`);
await shot('7-held-pad-prompt');

// B: away, hidden. R1 with nothing out does nothing; the pad's D-pad up brings them out.
await tap('Digit1');
await until(() => gadgets.held === 0, 2000);
await wait(100);
report(gadgets.held === 0 && !binoculars.visible && gadgetPrompt() === null, 'B puts them away: hidden, no prompt');
await padTap(5);
await wait(300);
report(gadgets.held === 0 && gadgets.raised === 0, 'R1 with nothing out does nothing');
await padTap(12);
await until(() => gadgets.held === 1, 2000);
report(gadgets.held === 1 && gadgets.raised === 0, 'the pad’s D-pad up brings them out into her hands');

// The shoulder icons the face buttons' size (22 x 22), their outline centred on the pill's line.
const icon = document.querySelector('#gadget-prompt .glyph > svg');
const iconBox = icon?.getBoundingClientRect();
const shape = icon?.querySelector('path')?.getBoundingClientRect();
const pillBox = icon?.closest('.pill')?.getBoundingClientRect();
const off = shape && pillBox ? (shape.top + shape.height / 2) - (pillBox.top + pillBox.height / 2) : NaN;
report(!!iconBox && Math.abs(iconBox.height - 22) < 0.5 && Math.abs(iconBox.width - 22) < 0.5, 'the shoulder icon 22 × 22 px, as the face buttons’', iconBox ? `${iconBox.width.toFixed(1)} × ${iconBox.height.toFixed(1)} px` : 'no icon');
report(Math.abs(off) < 1, 'its outline centred on the text line', `${off.toFixed(2)} px off the pill's middle`);

// Hovering with the jetpack, then looking through them: the jetpack keeps answering (owner, 2026-11-16).
settings.wearingJetpack = true;
key('Space', true);
await until(() => character.flying, 3000);
await wait(1500);
const flyingBefore = character.flying;
await rightClick();
await until(() => gadgets.firstPerson, 2000);
await wait(800);
report(flyingBefore && character.flying && gadgets.firstPerson, 'hovering: through the binoculars and still flying', `flying before ${flyingBefore}, now ${character.flying}, first person ${gadgets.firstPerson}`);
key('Space', false);
await until(() => !character.flying, 3000);
const jetOff = !character.flying;
key('Space', true);
await until(() => character.flying, 3000);
report(jetOff && character.flying && gadgets.firstPerson, 'in first person the jet still goes off and on (Space; R2 on the pad, read the same way)', `went off: ${jetOff}, back on: ${character.flying}`);
await rightClick();
await wait(600);
report(character.flying && !gadgets.firstPerson, 'closing them leaves her flying', `flying ${character.flying}`);
key('Space', false);
await until(() => character.grounded, 8000);
settings.wearingJetpack = false;

// A cutscene: away at once.
const cutscene = w.__cutscene();
if (cutscene) {
  await cutscene.play('test-ship-shots');
  await wait(200);
  report(gadgets.held === 0 && !binoculars.visible, 'a cutscene puts them away at once', `held ${gadgets.held}`);
  cutscene.skip();
}
return results;
