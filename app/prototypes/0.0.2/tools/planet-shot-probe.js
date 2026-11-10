// Scene 0050, the planet from space (planet/shot.ts). The game's own mode, a new game:
//
//     node tools/probe-01.mjs tools/planet-shot-probe.js --game --shots .export/planet-shot
//
// A new game plays the planet shot first (the bars on), the title typed in, a screenshot at several times
// (set by hand); the wind in its last 2 s carried into cutscene 1, which follows. Runs in the page (probe-01.mjs).

const results = [];
const THREE_deg = (p) => (Math.atan2(p.x, p.z) * 180) / Math.PI;
const report = (ok, what, detail) => results.push(`${ok ? 'PASS' : 'FAIL'}  ${what}${detail ? `  (${detail})` : ''}`);
const shotP = w.__planetShot;
await until(() => shotP?.playing, 8000);
report(shotP?.playing && w.__start().animatic === 'planet', 'a new game plays the planet shot first', w.__start().animatic);
report(document.querySelector('#bars').classList.contains('on'), 'the black bars are on');
let frames = 0, slow = 0, last = performance.now();
for (const end = performance.now() + 3000; performance.now() < end; ) {
  await new Promise(requestAnimationFrame);
  const now = performance.now();
  if (now - last > 50) slow++;
  frames++;
  last = now;
}
report(slow <= 2, 'its first 3 s run smoothly', `${frames} frames, ${slow} over 50 ms; time ${shotP.time.toFixed(2)} s`);
const title = document.querySelector('#title-card');
const shownLetters = () => [...title.querySelectorAll('span')].filter((c) => c.style.visibility === 'visible').length;
const lines = [...title.children].map((d) => d.textContent);
report(!title.hidden && lines.length === 3 && lines[0] === 'BMTM-640 B', 'three lines', lines.join(' / '));
// One at a time (the first already typed when this starts, so its hold isn't measured): each typed, held 3 s, deleted from the end, the next 2 s after it's gone; a key sound per letter.
let sounds = 0;
const played = w.__audio.play.bind(w.__audio);
w.__audio.play = (id, ...rest) => { if (id === 'ui_type') sounds++; return played(id, ...rest); };
const timeline = [];
for (const [i, el] of [...title.children].entries()) {
  const spans = [...el.querySelectorAll('span')];
  const shown = () => spans.filter((s) => s.style.visibility === 'visible').length;
  await until(() => !el.hidden && shown() > 0, 15000);
  const start = shotP.time;
  const othersHidden = [...title.children].every((d, j) => j === i || d.hidden);
  await until(() => shown() === spans.length, 6000);
  const typed = shotP.time;
  await until(() => shown() < spans.length, 6000);
  const deleting = shotP.time;
  const lastFirst = spans.at(-1).style.visibility === 'hidden' && spans[0].style.visibility === 'visible';
  await until(() => el.hidden, 6000);
  timeline.push({ start, typed, deleting, gone: shotP.time, othersHidden, lastFirst });
}
const gaps = timeline.slice(1).map((l, i) => l.start - timeline[i].gone);
report(timeline.every((l, i) => l.othersHidden && l.lastFirst && (i === 0 || Math.abs(l.deleting - l.typed - 3) < 0.2)) && gaps.every((g) => Math.abs(g - 2) < 0.2),
  'one line at a time: held 3 s, deleted from the end, the next 2 s later', timeline.map((l) => `${l.start.toFixed(1)}–${l.gone.toFixed(1)} s`).join(', ') + `; gaps ${gaps.map((g) => g.toFixed(2)).join(', ')}`);
const letters = 'Status:unexploredAsignalofunknownoriginwasdetected.'.length; // lines 2 and 3 (the first began before the count)
// Deleted too (owner, 2026-11-10): line 1's 9 and lines 2–3's, at ~57 a second, at most one sound a frame.
const keys = letters * 2 + 9;
report(sounds >= letters + 40 && sounds <= keys + 9, 'a key sound per letter typed and deleted', `${sounds} sounds, ${keys} keys`);
w.__audio.play = played;
// Held at each time while it's taken (played on, it would end before the last one).
const advance = shotP.update.bind(shotP);
shotP.update = (dt, aspect) => advance(0, aspect);
for (const t of [0.5, 3, 10, 13, 16.5, 18, 21, 25, 29.5, 30.3, 30.99]) {
  shotP.time = t;
  advance(0, w.__view.camera.aspect);
  await wait(400);
  await shot(`t${String(t).padStart(4, '0')}`);
  results.push(`  t ${t} s: ${shotP.camera.getFocalLength().toFixed(1)} mm, orbit ${THREE_deg(shotP.camera.position).toFixed(1)}°`);
}
shotP.update = advance;
// The wind: silent in space until 2 s before the end, then fading in, on through the cut into cutscene 1
// without dropping back (owner, 2026-11-10).
const end = 31; // the 1 s lead and the 30 s zoom
shotP.time = end - 4;
await until(() => shotP.time > end - 2.5, 4000);
const before = w.__wind.level;
await until(() => shotP.time > end - 0.1, 4000);
const atCut = w.__wind.level;
const whiteAtCut = Number(getComputedStyle(document.querySelector('#white')).opacity);
const barsAtCut = document.querySelector('#bars').classList.contains('on');
await until(() => w.__cutscene().playing, 5000);
const after = [];
for (const stop = performance.now() + 1500; performance.now() < stop; ) {
  await new Promise(requestAnimationFrame);
  after.push(w.__wind.level);
}
const dropped = Math.min(...after) < atCut - 0.02;
const white = document.querySelector('#white');
const barsKept = document.querySelector('#bars').classList.contains('on');
await until(() => !white.classList.contains('on'), 8000);
await wait(1200);
const whiteGone = Number(getComputedStyle(white).opacity);
report(whiteAtCut > 0.9 && barsAtCut && barsKept && whiteGone < 0.02, 'to white at the end, the bars kept, cutscene 1 in from white', `white ${whiteAtCut.toFixed(2)} at the cut, ${whiteGone.toFixed(2)} after; bars ${barsAtCut}/${barsKept}`);
report(before === 0 && atCut > 0.4 && !dropped && after.at(-1) > atCut, 'the wind: silent until 2 s before the end, carried on into cutscene 1', `${before.toFixed(2)} at ${end - 2.5} s, ${atCut.toFixed(2)} at the cut, ${Math.min(...after).toFixed(2)}–${after.at(-1).toFixed(2)} in cutscene 1's first 1.5 s`);
report(!shotP.playing && w.__cutscene().track?.id === 'cutscene-1' && title.hidden, 'played out: cutscene 1 plays, the title gone', w.__cutscene().track?.id);
return results.join('\n');
