// After the reload (*Continue*): the conversation is remembered (the one-liner), the jetpack and the
// parka are on her, the rack's place empty. See conversation-probe.js. Clears the save at the end.

const results = [];
const report = (ok, name, detail) => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `: ${detail}` : ''}`);
const story = w.__story(), dialogue = w.__dialogue;

report(w.__start().shown === 'continue', 'CONTINUE offered', `shown ${w.__start().shown}`);
await wait(500);
report(w.__settings.wearingJetpack === true, 'the jetpack on her', `${w.__settings.wearingJetpack}`);
report(w.__settings.outfit === 'parka', 'the parka on her', `${w.__settings.outfit}`);
const rack = w.__rack();
report(rack?.hers ? !rack.hers.visible : false, "the rack's jetpack gone", `visible ${rack?.hers?.visible}`);
story.run('talk_kaufman');
const line = dialogue.line;
report(dialogue.active && /one-liner/.test(line?.text ?? ''), 'talking to Dr. Kaufman: the one-liner, remembered', line?.text);
await w.__save.clear();
return results;
