// The viewport closed in chapter 1 (owner, 2026-11-20; the scene's `whenClosed`, src/when-closed.ts):
// once it's shut, Dr. Ogawa's lines (`viewport_closed`); once they're over, it opens again, its
// lever too. Every time: twice here. In app/:
//
//     npm run probe -- tools/viewport-probe.js --game --query scene=chapter-1
//
// Runs in the page (probe-01.mjs).

const director = w.__director(), story = w.__story(), interaction = w.__interaction();
const results = [];
const report = (ok, what, detail) => results.push(`${ok ? 'PASS' : 'FAIL'}  ${what}${detail ? `  (${detail})` : ''}`);

await until(() => director.current === 'chapter-1', 20000);
// Adam's line first (the scene's `begin`): closed, then the box's cooldown.
if (await until(() => w.__dialogue.active, 5000)) w.__dialogue.end();
await until(() => !w.__dialogue.cooling && !w.__dialogue.active, 3000);

const ids = ['engineering-window-left', 'engineering-window-right', 'engineering-window-lever-handle'];
const parts = ids.map((id) => w.__entity(id)?.find((c) => 'open' in c));
const state = () => parts.map((d) => `${d?.open ? 'open' : 'closed'} ${d?.amount?.toFixed(2)}`).join(', ');
const allOpen = () => parts.every((d) => d?.open && d.amount === 1);
report(allOpen(), 'the viewport starts open', state());

let heard = null;
const show = story.onLines;
story.onLines = (lines, topics) => {
  heard = lines.map((l) => `${l.speaker ?? '-'}: ${l.text}`).join(' / ');
  show?.(lines, topics);
};
const lever = interaction.items.find((i) => i.controls?.includes(parts[0]));
report(Boolean(lever), 'the lever is an interaction', lever?.name);

for (const time of ['first', 'second']) {
  heard = null;
  report(lever?.verb().startsWith('Close'), `${time}: the lever offers to close it`, lever?.verb());
  lever?.act();
  await wait(300);
  report(!w.__dialogue.active, `${time}: nothing said while it closes`, state());
  report(await until(() => w.__dialogue.active, 5000), `${time}: Dr. Ogawa speaks once it's shut`, state());
  report(heard?.startsWith('Dr. Ogawa: Dr. Green, can you please open the viewport?') && heard.endsWith('Dr. Green: Sorry'), `${time}: his lines and hers`, heard);
  report(parts.every((d) => !d?.open), `${time}: shut while he talks`, state());
  if (time === 'first') await shot('viewport-talking');
  await wait(500);
  w.__dialogue.end();
  report(await until(allOpen, 5000), `${time}: open again once the lines are over`, state());
  await until(() => !w.__dialogue.cooling, 3000);
  await wait(300);
}
story.onLines = show;
return results.join('\n');
