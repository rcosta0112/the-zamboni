// Cutscene 1, the ship outside (from the owner's fly-by: doc/plans/features/flying-scene.md). The
// game's own mode:
//
//     node tools/probe-01.mjs tools/cutscene-1-probe.js --game --shots .export/cutscene-1
//
// About 40 s. A new game plays cutscene 1: the camera where the fly-by has it (in the ship's own
// space, at three times), the ship swaying and the camera not with it, Dr. Green hidden, a screenshot
// at each time, its shadow casters swaying with it; a press shows the skip prompt; held 3 s, E skips:
// that puts them back, shows her and starts cutscene 2, which is skipped the same way.
// Runs in the page (probe-01.mjs).

const results = [];
const report = (ok, what, detail) => results.push(`${ok ? 'PASS' : 'FAIL'}  ${what}${detail ? `  (${detail})` : ''}`);
const cutscene = w.__cutscene(), hull = w.__ship().object, caster = w.__ship().shadowCaster, character = w.__character;

await until(() => cutscene.playing, 5000);
report(cutscene.track?.id === 'cutscene-1' && w.__start().animatic === 'cutscene-1', 'a new game plays cutscene 1', cutscene.track?.id);
report(!character.root.visible, 'Dr. Green is hidden');
report(document.querySelector('#bars').classList.contains('on'), 'the black bars are on');
await until(() => w.__treadmill()?.group.visible, 10000);
// The scenery at the track's speed, times the terrain's, while it plays: from 2 s in, past the stall of
// about a second in its first frames (found 2026-10-24, not fixed: SC-131).
await until(() => cutscene.time > 2, 8000);
const gone = w.__treadmill().travelled, since = performance.now();
await wait(1000);
const pace = (w.__treadmill().travelled - gone) / ((performance.now() - since) / 1000) / w.__settings.flightSpeed;
report(Math.abs(pace - (cutscene.track.speed ?? 1)) < 0.25, "the scenery at the cutscene's speed", `${pace.toFixed(2)} times the terrain's (the track: ${cutscene.track.speed ?? 1})`);

// The fly-by's camera (tools/flyby-cutscene.py's output, read from Blender), in the ship file's metres.
const expected = [
  [0.1, [-94.0, -116.4, 128.8]],
  [10.6667, [-83.8, -90.6, 98.2]],
  [17.75, [-74.0, -65.7, 68.7]],
];
let swayed = 0, castersOff = 0;
for (const [t, at] of expected) {
  cutscene.time = t;
  await wait(60);
  const local = cutscene.rest.worldToLocal(cutscene.camera.position.clone());
  const blender = [local.x, -local.z, local.y];
  const off = Math.hypot(...blender.map((v, i) => v - at[i]));
  report(off < 1.5, `the camera at ${t} s where the fly-by has it`, `${blender.map((v) => v.toFixed(1)).join(', ')}; ${off.toFixed(2)} m off`);
  swayed = Math.max(swayed, (hull.quaternion.angleTo(cutscene.rest.quaternion) * 180) / Math.PI);
  castersOff = Math.max(castersOff, (caster.quaternion.angleTo(hull.quaternion.clone().multiply(cutscene.rest.quaternion.clone().invert())) * 180) / Math.PI);
  cutscene.time = Math.max(0, t - 1.6); // the screenshot at about t (it waits 1.5 s)
  await wait(1500);
  await shot(`t${Math.round(t)}`);
}
report(swayed > 0.3, 'the ship sways', `up to ${swayed.toFixed(2)}° off its own pose`);
report(castersOff < 0.01, 'its shadow casters sway with it', `${castersOff.toFixed(3)}° apart at most`);

// Skipping (SC-126): a press shows "Hold E to skip" and skips nothing; holding E for 3 s skips.
const skip = w.__skip, el = document.querySelector('#skip');
const key = (code, down) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code }));
cutscene.time = 1; // far from its end: it would run out by itself
key('Space', true);
key('Space', false);
await wait(300);
report(cutscene.playing && skip.shown && el.querySelector('.glyph').textContent === 'E', 'a press shows the skip prompt (the E key), and skips nothing', el.textContent);
await until(() => !skip.shown, 5000);
report(!skip.shown && cutscene.playing, 'the prompt goes after 3 s');
key('KeyE', true);
const held = performance.now();
await wait(1500);
report(cutscene.playing && skip.shown, 'held 1.5 s: still playing, the prompt up');
await until(() => !cutscene.playing, 3000);
const took = (performance.now() - held) / 1000;
report(!cutscene.playing && took > 2.8 && took < 3.6, 'held 3 s, a skip ends it', `${took.toFixed(2)} s`);
report(hull.quaternion.angleTo(cutscene.rest.quaternion) < 1e-6 && hull.position.distanceTo(cutscene.rest.position) < 1e-6, 'the ship back in its own pose');
report(character.root.visible, 'Dr. Green shown again');
report(caster.quaternion.angleTo(new w.__THREE.Quaternion()) < 1e-6 && caster.position.length() < 1e-6, 'the shadow casters back in place');
const next = await until(() => w.__watched()?.playing, 3000);
report(next, 'cutscene 2 starts after it');
// Cutscene 2: E still held from the skip doesn't count; let go and held again, it skips too.
await wait(3500);
report(w.__watched().playing, 'the button still held: cutscene 2 not skipped');
key('KeyE', false);
await wait(200);
key('KeyE', true);
await until(() => !w.__watched().playing, 5000);
key('KeyE', false);
report(!w.__watched().playing && !w.__dialogue.active, 'held again 3 s, cutscene 2 skipped');
await wait(200);
report(!skip.shown && !document.querySelector('#bars').classList.contains('on'), 'no prompt or bars after it');

await w.__save.clear();
return results;
