// Cutscene 1, the ship outside (from the owner's fly-by: doc/plans/features/flying-scene.md). The
// game's own mode:
//
//     node tools/probe-01.mjs tools/cutscene-1-probe.js --game --shots .export/cutscene-1
//
// About 40 s. A new game plays cutscene 1: the camera where the fly-by has it (in the ship's own
// space, at three times), the ship swaying and the camera not with it, Dr. Green hidden, a screenshot
// at each time, its shadow casters swaying with it; *skip* puts them back, shows her and starts cutscene 2.
// Runs in the page (probe-01.mjs).

const results = [];
const report = (ok, what, detail) => results.push(`${ok ? 'PASS' : 'FAIL'}  ${what}${detail ? `  (${detail})` : ''}`);
const cutscene = w.__cutscene(), hull = w.__ship().object, caster = w.__ship().shadowCaster, character = w.__character;

await until(() => cutscene.playing, 5000);
report(cutscene.track?.id === 'cutscene-1' && w.__start().animatic === 'cutscene-1', 'a new game plays cutscene 1', cutscene.track?.id);
report(!character.root.visible, 'Dr. Green is hidden');
report(document.querySelector('#bars').classList.contains('on'), 'the black bars are on');
await until(() => w.__treadmill()?.group.visible, 10000);
// The scenery at the track's speed, times the terrain's, while it plays.
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

window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' }));
await until(() => !cutscene.playing, 2000);
report(!cutscene.playing, 'a skip ends it');
report(hull.quaternion.angleTo(cutscene.rest.quaternion) < 1e-6 && hull.position.distanceTo(cutscene.rest.position) < 1e-6, 'the ship back in its own pose');
report(character.root.visible, 'Dr. Green shown again');
report(caster.quaternion.angleTo(new w.__THREE.Quaternion()) < 1e-6 && caster.position.length() < 1e-6, 'the shadow casters back in place');
const next = await until(() => w.__watched()?.playing, 3000);
report(next, 'cutscene 2 starts after it');

await w.__save.clear();
return results;
