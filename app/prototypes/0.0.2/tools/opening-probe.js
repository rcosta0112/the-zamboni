// Cutscene 2, watched (the opening in the cockpit; owner, 2026-10-22). The game's own mode:
//
//     node tools/probe-01.mjs tools/opening-probe.js --game --shots .export/opening
//
// About 60 s. A new game: cutscene 1, skipped; then cutscene 2 plays by itself, nothing
// pressed: the wide shot of the cockpit first, alone for about 2 s (owner, 2026-10-26), then each
// line's speaker gets their camera, where the ship file has it (a screenshot per line), each line moves on by itself,
// she doesn't move, the black bars are on; at its end the bars go, the save is written, and she gets
// up from her seat (piloting-loop.md) and walks.
// Runs in the page (probe-01.mjs).

const results = [];
const report = (ok, what, detail) => results.push(`${ok ? 'PASS' : 'FAIL'}  ${what}${detail ? `  (${detail})` : ''}`);
const dialogue = w.__dialogue, character = w.__character;

await until(() => w.__cutscene().playing, 5000);
report(w.__cutscene().track?.id === 'cutscene-1', 'cutscene 1 after a new game');
// Skipped by holding E for 3 s (skip-prompt.ts).
window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' }));
await until(() => !w.__cutscene().playing, 5000);
window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE' }));
await until(() => w.__watched()?.playing, 3000);
const data = await (await fetch('/conversations/opening.json')).json();
const THREE = w.__THREE;
// Where the file's camera is, in the world (Blender (x, y, z) is the ship's (x, z, -y)).
const fileCamera = (id) => {
  const at = data.shots[id]?.camera?.at;
  return at ? w.__ship().object.localToWorld(new THREE.Vector3(at[0], at[2], -at[1])) : null;
};
const off = (id) => fileCamera(id)?.distanceTo(w.__watched().camera.position) ?? Infinity;
const openedAt = performance.now();
report(w.__watched().speaker === 'opening' && !dialogue.line && off('opening') < 0.01, 'it opens on the wide shot, no line', `${w.__watched().speaker}, ${(off('opening') * 100).toFixed(1)} cm from the file's camera`);
await wait(300);
await shot('line-00-opening');
const started = await until(() => w.__watched()?.playing && dialogue.line, 4000);
const held = (performance.now() - openedAt) / 1000;
report(started && held > 1.7 && held < 2.6, 'cutscene 2 starts after cutscene 1, its first line after the wide shot', `held ${held.toFixed(1)} s`);
const placed = [];
const feet = character.position.clone();
const seen = [];
const t0 = performance.now();
let last = null;
let barsOn = false;
while (w.__watched()?.playing && performance.now() - t0 < 60000) {
  const line = dialogue.line;
  const key = line ? `${line.id}: ${line.text}` : null;
  barsOn ||= document.querySelector('#bars').classList.contains('on');
  if (key && key !== last) {
    last = key;
    await wait(400); // the cut, and some of the line typed
    const cam = w.__watched().camera.position;
    placed.push(`${line.id} ${(off(line.id) * 100).toFixed(1)} cm`);
    seen.push(`${((performance.now() - t0) / 1000).toFixed(1)} s  ${w.__watched().speaker}  ${key}  camera ${cam.toArray().map((n) => n.toFixed(2)).join(', ')}`);
    await shot(`line-${String(seen.length).padStart(2, '0')}-${line.id}`);
  }
  await wait(100);
}
const took = (performance.now() - t0) / 1000;
report(seen.length === 9, 'its nine lines, each on its own, nothing pressed', `${seen.length} lines in ${took.toFixed(1)} s`);
report(placed.length === 9 && placed.every((p) => parseFloat(p.split(' ')[1]) < 1), "each line on its speaker's camera from the file", placed.join(', '));
report(!w.__watched().playing && !dialogue.active, 'it ends by itself');
report(character.position.distanceTo(feet) < 0.05, "she didn't move", `${character.position.distanceTo(feet).toFixed(3)} m`);
report(barsOn, 'the black bars were on while it played');
report(!document.querySelector('#bars').classList.contains('on'), 'the bars are gone after it');
await wait(1500);
const save = await w.__save.read();
report(save?.checkpoint === 'chapter-1' && Date.now() - Date.parse(save.savedAt) < 3000, 'saved at its end', `checkpoint ${save?.checkpoint}`);
// Chapter 1 is playable: she starts seated; Get up (E), then she walks back from her seat (S: away from where the camera looks).
report(character.model?.seated === true, 'chapter 1 starts her seated');
window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' }));
window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE' }));
await until(() => character.model?.seated === false, 3000);
const before = character.position.clone();
window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyS' }));
await wait(1200);
window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyS' }));
await wait(300);
report(character.position.distanceTo(before) > 0.5, 'then chapter 1 plays: she walks', `${character.position.distanceTo(before).toFixed(2)} m`);
await shot('after');
await w.__save.clear();
return [...results, ...seen];
