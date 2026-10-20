// The checkpoint save and *Continue* (the game's structure, pass 4), after the reload: the start
// screen offered CONTINUE (the probe's Enter used it), and the game is back in `later` with the story
// as saved and the things moved before the reload back to the scene's setup. See save-probe.js.
//
// Returns one "PASS …" / "FAIL …" line per check. Runs in the page (probe-01.mjs): `w`, `ship`, `wait`, `until`, `shot`.

const results = [];
const report = (ok, name, detail) => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `: ${detail}` : ''}`);
const director = w.__director();
const story = w.__story();
const sideDoor = () => w.__entity('side-door')?.components[0];

report(w.__start().shown === 'continue', 'the save was found: CONTINUE offered, its scene under the start screen', `shown ${w.__start().shown}`);
report(director.current === 'later', 'continued in later', `scene ${director.current}`);
report(story.get('side_door_unlocked') === true, 'the story as saved', `side_door_unlocked ${story.get('side_door_unlocked')}`);
report(sideDoor()?.open === true && sideDoor()?.amount === 1, "the side door back to the scene's setup (open)", `open ${sideDoor()?.open}, amount ${sideDoor()?.amount}`);
report(w.__settings.cargoRampOpen === false && ship.rampAmount === 0, "the ramp back to the scene's setup (closed)", `open ${w.__settings.cargoRampOpen}, amount ${ship.rampAmount}`);
const kaufman = w.__entity('kaufman');
report(Boolean(kaufman), 'Dr. Kaufman is there', kaufman ? 'found' : 'no entity');

await director.start('locked');
report(sideDoor()?.locked === false, 'locked, started again: the saved story keeps the side door unlocked', `locked ${sideDoor()?.locked}`);

await w.__save.clear();
report((await w.__save.read()) === null, 'the save cleared', '');
return results;
