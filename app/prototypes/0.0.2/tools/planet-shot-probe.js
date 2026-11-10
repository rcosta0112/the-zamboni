// Scene 0050, the planet from space (planet/shot.ts). The game's own mode, a new game:
//
//     node tools/probe-01.mjs tools/planet-shot-probe.js --game --shots .export/planet-shot
//
// A new game plays the planet shot first (the bars on), the title typed in, a screenshot at several times
// (set by hand), then skipped: cutscene 1 next. Runs in the page (probe-01.mjs).

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
const shownLetters = () => [...title.children].filter((c) => c.style.visibility === 'visible').length;
report(!title.hidden && shownLetters() === 10 && title.style.opacity === '', 'the title typed in (no fade)', `${shownLetters()} letters at ${shotP.time.toFixed(2)} s`);
await until(() => shotP.time > 5.45, 5000);
const midway = shownLetters();
await until(() => shotP.time > 6, 5000);
report(midway > 0 && midway < 10 && shownLetters() === 0, 'deleted from the end 3 s after typing', `${midway} letters at 5.45 s, ${shownLetters()} at 6 s`);
for (const t of [0, 4, 12, 20, 24, 30, 34.5, 35.5]) {
  shotP.time = t;
  shotP.update(0, w.__view.camera.aspect);
  await wait(400);
  await shot(`t${String(t).padStart(4, '0')}`);
  results.push(`  t ${t} s: ${shotP.camera.getFocalLength().toFixed(1)} mm, orbit ${THREE_deg(shotP.camera.position).toFixed(1)}°`);
}
shotP.skip();
await until(() => w.__cutscene().playing, 5000);
report(!shotP.playing && w.__cutscene().track?.id === 'cutscene-1' && title.hidden, 'skipped: cutscene 1 plays, the title gone', w.__cutscene().track?.id);
return results.join('\n');
