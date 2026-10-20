// Ink in the game (the game's structure, pass 3): the test scene `locked` locks the side door unless
// the story's `side_door_unlocked` is set; its keypad runs the story's knot, which sets it and unlocks
// the door; started again, the scene finds the door unlocked. In app/:
//
//     npm run probe -- tools/story-probe.js
//
// Returns one "PASS …" / "FAIL …" line per check. Runs in the page (probe-01.mjs): `w`, `ship`, `wait`, `until`, `shot`.

const results = [];
const report = (ok, name, detail) => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `: ${detail}` : ''}`);
const director = w.__director();
const story = w.__story();
const door = () => w.__entity('side-door')?.components[0];
const keypad = w.__interaction().items.find((i) => i.objects[0]?.userData.id === 'side-door-keypad');
const sideDoor = w.__interaction().items.find((i) => i.objects[0]?.userData.id === 'side-door');

report(Boolean(story), 'the story is loaded', story ? `side_door_unlocked: ${story.get('side_door_unlocked')}` : 'no story');
report(Boolean(keypad), 'the side door has its keypad', keypad?.name ?? 'none');

await director.start('locked');
report(door()?.locked === true && door()?.open === false, 'locked: the side door is locked and closed', `locked ${door()?.locked}, open ${door()?.open}`);
report(keypad?.verb() === 'Unlock door', 'its keypad offers the knot\'s verb', `"${keypad?.verb()}"`);
if (sideDoor) report(sideDoor.verb() === 'Locked', 'the door itself says Locked', `"${sideDoor.verb()}"`);

keypad?.act();
report(story?.get('side_door_unlocked') === true, 'the keypad set the story variable', `${story?.get('side_door_unlocked')}`);
report(door()?.locked === false && door()?.open === false, 'the knot unlocked the door (still closed)', `locked ${door()?.locked}, open ${door()?.open}`);
report(keypad?.verb() === 'Open door', 'the keypad works as before', `"${keypad?.verb()}"`);

keypad?.act();
await until(() => door()?.amount === 1, 8000).catch(() => undefined);
report(door()?.amount === 1, 'the keypad opens it', `amount ${door()?.amount}`);

await director.start('locked');
report(door()?.locked === false && door()?.open === false, 'locked again: the story says unlocked, the door is at its default', `locked ${door()?.locked}, open ${door()?.open}`);

story?.set('side_door_unlocked', false);
await director.start('locked');
report(door()?.locked === true, 'the variable cleared: locked again', `locked ${door()?.locked}`);

await director.start('opening');
report(door()?.locked === false, 'opening: nothing locked', `locked ${door()?.locked}`);
return results;
