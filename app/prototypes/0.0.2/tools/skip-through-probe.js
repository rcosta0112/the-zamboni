// A skip in the animatic skips all of it, on to chapter 1 (0300; owner, 2026-11-18). The game's own mode:
//
//     npm run probe -- tools/skip-through-probe.js --game --query scene=0050   (also scene=0100)
//
// About 25 s. A new game; the part playing (scene 0050 or cutscene 1) skipped by holding the right mouse button;
// then nothing of cutscene 1, cutscene 2 or its exterior shot plays: chapter 1's first lines (watched) come next,
// no white or black left up. Runs in the page (probe-01.mjs).

const results = [];
const report = (ok, what, detail) => results.push(`${ok ? 'PASS' : 'FAIL'}  ${what}${detail ? `  (${detail})` : ''}`);
const playing = () => (w.__planetShot?.playing ? 'planet' : w.__cutscene().playing ? w.__cutscene().track.id : w.__watched()?.playing ? 'watched' : null);
await until(() => playing(), 8000);
const first = playing();
report(first === 'planet' || first === 'cutscene-1', 'a part of the animatic plays', first);
await wait(1500);
const seen = new Set();
const watch = setInterval(() => { const p = playing(); if (p) seen.add(p === 'watched' ? `watched ${w.__watched().data?.knot}` : p); }, 0);
window.dispatchEvent(new MouseEvent('mousedown', { button: 2 }));
await until(() => playing() !== first, 6000);
window.dispatchEvent(new MouseEvent('mouseup', { button: 2 }));
await wait(1500);
clearInterval(watch);
seen.delete(first);
const after = [...seen];
report(!after.includes('cutscene-1') && !after.includes('cutscene-2-exterior') && !after.includes('watched cutscene_opening'), 'nothing of the animatic after the skip', after.join(', ') || 'nothing');
const lines = w.__dialogue.line;
report(w.__watched()?.playing && !w.__cutscene().playing, "chapter 1's first lines, watched", lines ? `${lines.id}: ${lines.text}` : 'no line');
const white = document.querySelector('#white'), black = document.querySelector('#black');
report(!white.classList.contains('on') && !black.classList.contains('on') && getComputedStyle(white).opacity === '0', 'no white or black left up', `white ${getComputedStyle(white).opacity}, black ${getComputedStyle(black).opacity}`);
return results.join('\n');
