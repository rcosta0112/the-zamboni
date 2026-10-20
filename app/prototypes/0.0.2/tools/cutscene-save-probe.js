// The cutscene from the story, and the checkpoint at its end (the game's structure, pass 5b), before
// the reload: in `locked`, the side door's keypad runs the story's knot, which unlocks the door and
// plays `test-ship-shots`; at its end the scene is saved with the story as it is then, and the world
// is what the scene's setup now gives (compared by starting the scene again).
// cutscene-save-probe-after.js, after the reload, continues. In app/:
//
//     npm run probe -- tools/cutscene-save-probe.js --reload tools/cutscene-save-probe-after.js
//
// Returns one "PASS …" / "FAIL …" line per check. Runs in the page (probe-01.mjs): `w`, `ship`, `wait`, `until`, `shot`.

const results = [];
const report = (ok, name, detail) => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `: ${detail}` : ''}`);
const director = w.__director();
const story = w.__story();
const player = w.__cutscene();
const keypad = w.__interaction().items.find((i) => i.objects[0]?.userData.id === 'side-door-keypad');
const door = () => w.__entity('side-door')?.components[0];
const doors = () => w.__ship().entities.all().flatMap((e) => e.components.filter((c) => 'open' in c).map((c) => `${e.id}:${c.open}:${c.locked}`)).join(' ');

story.set('side_door_unlocked', false);
await director.start('locked');
await wait(300);
const feet = w.__character.position.clone();
report(door()?.locked === true && keypad?.verb() === 'Unlock door', 'locked: the side door locked, its keypad offers the knot', `locked ${door()?.locked}, "${keypad?.verb()}"`);

keypad?.act();
await until(() => player.playing, 5000).catch(() => undefined);
report(player.playing && player.track?.id === 'test-ship-shots', "the knot plays the cutscene after unlocking", `playing ${player.playing}, door locked ${door()?.locked}`);
await until(() => !player.playing, 15000).catch(() => undefined);
await wait(500);
const save = await w.__save.read();
report(!player.playing && save?.checkpoint === 'locked' && Date.now() - Date.parse(save.savedAt) < 2000, 'a checkpoint at its end: the scene saved', `checkpoint ${save?.checkpoint}, ${save ? Date.now() - Date.parse(save.savedAt) : '-'} ms ago`);
report(save?.story.includes('"side_door_unlocked":true') ?? false, 'the saved story has the door unlocked', `${save?.story.length} characters`);
report(w.__character.position.distanceTo(feet) < 0.05, 'she stands where she stood', `moved ${w.__character.position.distanceTo(feet).toFixed(3)}`);

// Its end state against the scene's setup, which now reads the story.
const after = doors();
await director.start('locked');
report(doors() === after, "its end is what the scene's setup gives now", after === doors() ? '' : `${after} vs ${doors()}`);
report(door()?.locked === false, 'the side door stays unlocked', `locked ${door()?.locked}`);
return results;
