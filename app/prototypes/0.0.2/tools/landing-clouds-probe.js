// The landing's clouds (0600, pass 4): screenshots at set times, how many cards are drawn at each, and
// none left once the cutscene has ended. About 40 s:
//
//     node tools/probe-01.mjs tools/landing-clouds-probe.js --game --query scene=0600 --shots .export/clouds
//
// Plan: doc/plans/features/landing-cutscene.md

await until(() => w.__cutscene()?.playing, 30000);
const cs = w.__cutscene();
const info = [];
for (const at of [0.5, 5, 7.5, 9, 9.6, 11, 13, 15.5]) {
  await until(() => !cs.playing || cs.time >= at, 30000);
  if (!cs.playing) { info.push('ended before ' + at); break; }
  info.push(`${at}: t=${cs.time.toFixed(2)} clouds drawn=${w.__clouds.shown}`);
  await shot('t' + String(at).replace('.', '_'));
}
await until(() => !cs.playing, 10000);
info.push(`after: clouds drawn=${w.__clouds.shown}`);
return info.join('\n');
