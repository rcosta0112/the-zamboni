// A whole conversation, the one-liner after it, and the save (the dialogue plan, pass 2), before the
// reload: Dr. Kaufman's four screens, the save written when it ends; talking again gives the one-liner;
// the jetpack and the parka put on, the save written again. conversation-probe-after.js, after the
// reload (*Continue*), finds all three kept. In app/:
//
//     npm run probe -- tools/conversation-probe.js --reload tools/conversation-probe-after.js
//
// Returns one "PASS …" / "FAIL …" line per check. Runs in the page (probe-01.mjs): `w`, `wait`, `until`.

const results = [];
const report = (ok, name, detail) => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `: ${detail}` : ''}`);
const story = w.__story(), dialogue = w.__dialogue;
const press = async () => {
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' }));
  window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE' }));
  await wait(250);
};
/** Runs a knot and reads every screen until the box ends it: "Speaker: text" each. */
const talk = async (knot) => {
  story.run(knot);
  const said = [];
  for (let i = 0; i < 12 && dialogue.active; i++) {
    const line = dialogue.line;
    if (line && said.at(-1) !== `${line.speaker}: ${line.text}`) said.push(`${line.speaker}: ${line.text}`);
    await press();
  }
  await wait(1200); // the cooldown
  return said;
};
const savedAt = async () => (await w.__save.read())?.savedAt ?? 0;

await wait(300);
const before = await savedAt();
const first = await talk('talk_kaufman');
const speakers = first.map((s) => s.split(':')[0]).join(', ');
report(first.length === 4 && speakers === 'Dr. Kaufman, Dr. Green, Dr. Kaufman, Dr. Green', 'the conversation: four screens, back and forth', speakers);
report(!dialogue.active, 'the box ended it', `active ${dialogue.active}`);
const afterTalk = await savedAt();
report(afterTalk > before, 'saved when the conversation ended', `savedAt ${before} → ${afterTalk}`);
const again = await talk('talk_kaufman');
report(again.length === 1 && /one-liner/.test(again[0]), 'talking again: the one-liner', again.join(' | '));

w.__settings.wearingJetpack = true;
w.__settings.outfit = 'parka';
await wait(500);
report(story.get('green_jetpack') === true && story.get('green_outfit') === 'parka', 'Ink keeps the jetpack and the parka', `${story.get('green_jetpack')}, ${story.get('green_outfit')}`);
const saved = await w.__save.read();
report(/"green_jetpack":true/.test(saved?.story ?? '') && /"green_outfit":"\^parka"/.test(saved?.story ?? ''), 'saved with them', `savedAt ${afterTalk} → ${saved?.savedAt}`);
return results;
