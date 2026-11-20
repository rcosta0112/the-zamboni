// The flyby (0400) and *What's that?* (0500) started from the address (doc/plans/features/flyby-0400.md):
//
//     node tools/probe-01.mjs tools/flyby-probe.js --game --query scene=0400
//     node tools/probe-01.mjs tools/flyby-probe.js --game --query scene=0500
//
// 0400: the flyby plays from the start, the whats-that scene under it, she hidden; skipped, the
// conversation follows. 0500: the conversation at once, no flyby. Either way the conversation's skip
// starts the landed scene. The chain from chapter 1's *Sit down*: landed-probe.js. Runs in the page.

const results = [];
const report = (ok, what, detail) => results.push(`${ok ? 'PASS' : 'FAIL'}  ${what}${detail ? `  (${detail})` : ''}`);
const from0400 = new URLSearchParams(location.search).get('scene') === '0400';

await until(() => w.__director()?.current === 'whats-that', 10000);
if (from0400) {
  const playing = await until(() => w.__cutscene().playing && w.__cutscene().track?.id === 'flyby', 5000);
  await until(() => w.__cutscene().time > 1, 5000);
  report(playing && !w.__character.root.visible && !w.__watched()?.playing, '0400: the flyby plays, the whats-that scene under it, she hidden, no conversation yet', `${w.__cutscene().track?.id}, ${w.__director().current}`);
  w.__cutscene().skip();
} else {
  report(!w.__cutscene().playing, '0500: no flyby', w.__cutscene().track?.id);
}
const talking = await until(() => w.__watched()?.playing, 6000);
report(talking && w.__director().current === 'whats-that', 'the conversation plays in the whats-that scene', w.__director().current);
w.__watched().skip?.();
const landed = await until(() => w.__director().current === 'landed', 6000);
report(landed, 'the conversation skipped: the landed scene', w.__director().current);
return results;
