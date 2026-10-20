// The cutscene's checkpoint (the game's structure, pass 5b), after the reload: CONTINUE finds `locked`
// with the side door unlocked and its keypad back to opening it. See cutscene-save-probe.js.
//
// Returns one "PASS …" / "FAIL …" line per check. Runs in the page (probe-01.mjs): `w`, `ship`, `wait`, `until`, `shot`.

const results = [];
const report = (ok, name, detail) => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `: ${detail}` : ''}`);
const keypad = w.__interaction().items.find((i) => i.objects[0]?.userData.id === 'side-door-keypad');
const door = w.__entity('side-door')?.components[0];

report(w.__start().shown === 'continue' && w.__director().current === 'locked', 'continued in locked', `shown ${w.__start().shown}, scene ${w.__director().current}`);
report(w.__story().get('side_door_unlocked') === true && door?.locked === false, 'the side door unlocked, as saved', `variable ${w.__story().get('side_door_unlocked')}, locked ${door?.locked}`);
report(keypad?.verb() === 'Open door', 'its keypad opens it now', `"${keypad?.verb()}"`);
report(!w.__cutscene().playing, 'no cutscene playing', '');

await w.__save.clear();
report((await w.__save.read()) === null, 'the save cleared', '');
return results;
