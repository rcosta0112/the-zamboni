// After the reload (*Continue*): the topic heard is still heard (gone from Dr. Ogawa's list). See
// topics-probe.js. Clears the save at the end.

const results = [];
const report = (ok, name, detail) => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `: ${detail}` : ''}`);
const story = w.__story(), dialogue = w.__dialogue;
const press = async () => {
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' }));
  window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE' }));
  await wait(250);
};

report(w.__start().shown === 'continue', 'CONTINUE offered', `shown ${w.__start().shown}`);
await wait(500);
story.run('talk_ogawa');
for (let i = 0; i < 20 && dialogue.active && !dialogue.line?.topics.length; i++) await press();
const offered = dialogue.line?.topics ?? [];
report(offered.length === 3 && !offered.some((t) => /second question/.test(t)) && offered.some((t) => /first question/.test(t)), 'after the reload: the topic heard still gone', offered.join(' | '));
await w.__save.clear();
return results;
