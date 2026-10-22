// Cutscene 2, watched (the opening in the cockpit; owner, 2026-10-22). The game's own mode:
//
//     node tools/probe-01.mjs tools/opening-probe.js --game --shots .export/opening
//
// About 60 s. A new game: cutscene 1's card, skipped; then cutscene 2 plays by itself, nothing
// pressed: each line's speaker gets the camera (a screenshot per line), each line moves on by itself,
// she doesn't move, the black bars are on; at its end the bars go, the save is written, and she walks.
// Runs in the page (probe-01.mjs).

const results = [];
const report = (ok, what, detail) => results.push(`${ok ? 'PASS' : 'FAIL'}  ${what}${detail ? `  (${detail})` : ''}`);
const dialogue = w.__dialogue, character = w.__character;

report(w.__start().animatic > 0, "cutscene 1's card after a new game");
window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' }));
const started = await until(() => w.__watched()?.playing && dialogue.line, 3000);
report(started, 'cutscene 2 starts after the card');
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
    seen.push(`${((performance.now() - t0) / 1000).toFixed(1)} s  ${w.__watched().speaker}  ${key}  camera ${cam.toArray().map((n) => n.toFixed(2)).join(', ')}`);
    await shot(`line-${String(seen.length).padStart(2, '0')}-${line.id}`);
  }
  await wait(100);
}
const took = (performance.now() - t0) / 1000;
report(seen.length === 9, 'its nine lines, each on its own, nothing pressed', `${seen.length} lines in ${took.toFixed(1)} s`);
report(!w.__watched().playing && !dialogue.active, 'it ends by itself');
report(character.position.distanceTo(feet) < 0.05, "she didn't move", `${character.position.distanceTo(feet).toFixed(3)} m`);
report(barsOn, 'the black bars were on while it played');
report(!document.querySelector('#bars').classList.contains('on'), 'the bars are gone after it');
await wait(1500);
const save = await w.__save.read();
report(save?.checkpoint === 'chapter-1' && Date.now() - Date.parse(save.savedAt) < 3000, 'saved at its end', `checkpoint ${save?.checkpoint}`);
// Chapter 1 is playable: she walks back from her seat (S: away from where the camera looks).
const before = character.position.clone();
window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyS' }));
await wait(1200);
window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyS' }));
await wait(300);
report(character.position.distanceTo(before) > 0.5, 'then chapter 1 plays: she walks', `${character.position.distanceTo(before).toFixed(2)} m`);
await shot('after');
await w.__save.clear();
return [...results, ...seen];
