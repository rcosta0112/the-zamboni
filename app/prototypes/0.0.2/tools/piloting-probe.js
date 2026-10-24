// Dr. Green piloting (doc/plans/features/piloting-loop.md, pass B). The game's own mode, from cutscene 2:
//
//     node tools/probe-01.mjs tools/piloting-probe.js --game --query scene=opening --shots .export/piloting
//
// About 60 s. Cutscene 2 plays with her seated at the `pilot` tag, the loop playing, the joystick
// following her left hand (a screenshot of her shot); it's skipped; chapter 1 starts her seated: she
// can't walk, the prompt reads *Get up*; E puts her in the aisle (the scene's start), the joystick
// upright, and she walks. Also her `Head` bone against the old guess (standing), for HEAD_ABOVE_BONE.
// Runs in the page (probe-01.mjs).

const results = [];
const report = (ok, what, detail) => results.push(`${ok ? 'PASS' : 'FAIL'}  ${what}${detail ? `  (${detail})` : ''}`);
const character = w.__character, dialogue = w.__dialogue;
const key = (code, down) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code }));
const pivot = w.__ship()?.object.getObjectByName('Joystick hinge');
const angle = () => (pivot ? (2 * Math.acos(Math.min(1, Math.abs(pivot.quaternion.w))) * 180) / Math.PI : NaN);
const fmt = (v) => v.toArray().map((n) => n.toFixed(2)).join(', ');

report(!!pivot, 'the joystick is on its pivot');
const started = await until(() => w.__watched()?.playing && dialogue.line, 8000);
report(started, 'cutscene 2 plays');
report(character.model?.seated === true, 'she is seated through it');
const a1 = angle();
await wait(1500);
const a2 = angle();
report(a1 > 1 && Math.abs(a2 - a1) > 0.05, 'the joystick leans and moves with her hand', `${a1.toFixed(1)}° then ${a2.toFixed(1)}°`);
// Her shot: wait for her line.
if (await until(() => w.__watched()?.speaker === 'green', 30000)) {
  await wait(600);
  await shot('cutscene-2-green');
  results.push(`      her shot: camera ${fmt(w.__watched().camera.position)}, her feet ${fmt(character.position)}`);
}
// Skipped by holding E for 3 s.
key('KeyE', true);
await until(() => !w.__watched()?.playing, 6000);
key('KeyE', false);
await wait(800);
report(character.model?.seated === true, 'chapter 1 starts her seated');
const seatedAt = character.position.clone();
key('KeyW', true);
await wait(1000);
key('KeyW', false);
report(character.position.distanceTo(seatedAt) < 0.01, "seated, she doesn't walk", `${character.position.distanceTo(seatedAt).toFixed(3)} m`);
await until(() => !document.querySelector('#prompt').hidden, 3000);
const verb = document.querySelector('#prompt')?.textContent ?? '';
report(/Get up/.test(verb), 'the prompt reads Get up', verb.trim());
await shot('chapter-1-seated');
key('KeyE', true);
key('KeyE', false);
await until(() => character.model?.seated === false, 3000);
await wait(500);
const aisle = new T.Vector3(-0.2, 3.74, 2.6); // the scene's start (-0.2, -2.6, 3.74) in glTF axes
const there = w.__ship().object.localToWorld(aisle.clone());
report(character.model?.seated === false && character.position.distanceTo(there) < 0.05, 'Get up: she is in the aisle', `${character.position.distanceTo(there).toFixed(3)} m from the start`);
report(angle() < 0.01, 'the joystick upright', `${angle().toFixed(2)}°`);
// Her head bone against the old guess (feet + height − 0.12), standing.
const head = character.model?.object.getObjectByName('Head');
if (head) {
  head.updateWorldMatrix(true, false);
  const bone = head.getWorldPosition(new T.Vector3()).y;
  results.push(`      standing: Head bone at ${(bone - character.position.y).toFixed(3)} m above her feet; the old guess ${(w.__settings.zamboniHeight - 0.12).toFixed(3)}`);
}
const before = character.position.clone();
key('KeyS', true);
await wait(1200);
key('KeyS', false);
await wait(300);
report(character.position.distanceTo(before) > 0.5, 'then she walks', `${character.position.distanceTo(before).toFixed(2)} m`);
await shot('after');
await w.__save.clear();
return results;
