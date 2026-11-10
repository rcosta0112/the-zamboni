// Screenshots through the landing cutscene (0600) at set times, with the flight keys at each; then whether the
// turbines are back at rest when the landed scene takes over. Edit the times in the list. About 40 s:
//
//     node tools/probe-01.mjs tools/landing-shots-probe.js --game --query scene=0600 --shots .export/landing
//
// Plan: doc/plans/features/landing-cutscene.md

await until(() => w.__cutscene()?.playing, 30000);
const cs = w.__cutscene();
const info = [];
for (const at of [0.5, 4, 7, 9.2, 9.5, 9.6, 9.7, 10, 10.3, 10.5, 12.5, 14.5, 15.8]) {
  await until(() => !cs.playing || cs.time >= at, 30000);
  if (!cs.playing) { info.push('ended before ' + at); break; }
  const f = cs.flight;
  info.push(`${at}: t=${cs.time.toFixed(2)} turbines=${JSON.stringify(f?.turbines)} flames=${f?.flames.toFixed(2)} reach=${f?.reach} visible=${w.__flames().visible}`);
  await shot('t' + String(at).replace('.', '_'));
}
await until(() => !cs.playing, 10000);
const zs = w.__ship();
info.push('after: turbinesDown=' + JSON.stringify(zs.turbinesDown) + ' rest ok=' + zs.turbines.every(t => t.node.quaternion.angleTo(t.rest) < 1e-4) + ' scene=' + w.__director()?.current);
return info.join('\n');
