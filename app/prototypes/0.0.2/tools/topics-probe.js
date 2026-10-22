// Topics in a conversation (the dialogue plan, *Topics*; the flying scene's pass 0), before the
// reload: Dr. Ogawa's opener, then her lines to choose from in the box (under her name, the first
// selected, no wrap), one picked by W / S and E, his answer next, the topic gone from the list after; the leave topic ends it and the save is written; the topic offered only
// after talking to Dr. Kaufman shows once she has. topics-probe-after.js, after the reload
// (*Continue*), finds the topic still heard. In app/prototypes/0.0.2:
//
//     node tools/probe-01.mjs tools/topics-probe.js --shots .export/topics --reload tools/topics-probe-after.js
//
// (`npm run probe -- tools/topics-probe.js --reload tools/topics-probe-after.js` without the screenshots.)
// Returns one "PASS …" / "FAIL …" line per check. Runs in the page (probe-01.mjs): `w`, `wait`, `shot`.

const results = [];
const report = (ok, name, detail) => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `: ${detail}` : ''}`);
const story = w.__story(), dialogue = w.__dialogue;
const press = async (code = 'KeyE') => {
  window.dispatchEvent(new KeyboardEvent('keydown', { code }));
  window.dispatchEvent(new KeyboardEvent('keyup', { code }));
  await wait(250);
};
/** Presses on until the topics are up or the box has ended: the lines seen, "Speaker: text" each. */
const toTopics = async () => {
  const said = [];
  for (let i = 0; i < 20 && dialogue.active && !dialogue.line?.topics.length; i++) {
    const line = dialogue.line;
    if (line && said.at(-1) !== `${line.speaker}: ${line.text}`) said.push(`${line.speaker}: ${line.text}`);
    await press();
  }
  return said;
};
const topics = () => dialogue.line?.topics ?? [];
const savedAt = async () => (await w.__save.read())?.savedAt ?? 0;
/** Picks the topic matching `re`: S down to it from the top (W first, to be sure), then E. */
const pick = async (re) => {
  for (let i = 0; i < 4; i++) await press('KeyW');
  const at = topics().findIndex((t) => re.test(t));
  for (let i = 0; i < at; i++) await press('KeyS');
  await press();
  return at;
};

story.reset(); // a new game's story: nothing heard yet
await wait(300);

story.run('talk_ogawa');
const opener = await toTopics();
report(opener.length === 2 && /opener/.test(opener[0]) && dialogue.active, 'the opener, then the topics', opener.join(' | '));
const first = topics();
report(first.length === 3 && /first question/.test(first[0]) && /second question/.test(first[1]) && /That's all/.test(first[2]), 'three topics (none after Dr. Kaufman yet)', first.join(' | '));
report(dialogue.line?.selected === 0 && dialogue.line?.speaker === 'Dr. Green', "the topics' screen: under her name, the first selected", `selected ${dialogue.line?.selected}, speaker ${dialogue.line?.speaker}`);
await shot('list');
await press('KeyS');
await press('KeyS');
const last = dialogue.line?.selected;
await press('ArrowDown');
report(last === 2 && dialogue.line?.selected === 2, "down to the last; it doesn't wrap", `${last}, then ${dialogue.line?.selected}`);
await press('ArrowUp');
report(dialogue.line?.selected === 1, 'up again', `${dialogue.line?.selected}`);
await shot('second-selected');
await press(); // picks the second topic
const answer = await toTopics();
report(answer.length === 1 && /answer to the second/.test(answer[0]), 'his answer next (her line not said again)', answer.join(' | '));
const after = topics();
report(after.length === 2 && !after.some((t) => /second question/.test(t)), 'the topic heard is gone from the list', after.join(' | '));
const before = await savedAt();
await pick(/That's all/);
report(!dialogue.active, 'the leave topic ends it', `active ${dialogue.active}`);
await wait(1200); // the cooldown
const saved = await savedAt();
report(saved > before, 'saved when it ended', `savedAt ${before} → ${saved}`);

// Dr. Kaufman's conversation, then Dr. Ogawa again: the shorter opener, and the topic after hers.
story.run('talk_kaufman');
for (let i = 0; i < 12 && dialogue.active; i++) await press();
await wait(1200);
story.run('talk_ogawa');
const again = await toTopics();
const offered = topics();
report(again.length === 1 && /Anything else/.test(again[0]), 'the second time: the shorter opener', again.join(' | '));
report(offered.length === 3 && offered.some((t) => /about Dr. Kaufman/.test(t)) && !offered.some((t) => /second question/.test(t)), 'the topic after Dr. Kaufman is offered now', offered.join(' | '));
await shot('after-kaufman');
await pick(/That's all/);
await wait(1200);
return results;
