// The checkpoint save and *Continue* (the game's structure, pass 4), before the reload: a new game
// (no save yet: the button says START), the side door's keypad sets the story's variable in `locked`,
// then the scene `later` starts (a checkpoint: saved) and things are moved that the save doesn't keep
// (the side door shut, the ramp opened). save-probe-after.js, after the reload, continues. In app/:
//
//     npm run probe -- tools/save-probe.js --reload tools/save-probe-after.js
//
// Returns one "PASS …" / "FAIL …" line per check. Runs in the page (probe-01.mjs): `w`, `ship`, `wait`, `until`, `shot`.

const results = [];
const report = (ok, name, detail) => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `: ${detail}` : ''}`);
const director = w.__director();
const story = w.__story();
const keypad = w.__interaction().items.find((i) => i.objects[0]?.userData.id === 'side-door-keypad');
const sideDoor = () => w.__entity('side-door')?.components[0];

report(w.__start().shown === 'new', 'no save yet: a new game under the start screen', `shown ${w.__start().shown}`);
await wait(300); // the first save: the scene under the screen, written when the button was used
const first = await w.__save.read();
report(first?.checkpoint === 'landed', 'START saved the first scene', `checkpoint ${first?.checkpoint}`);

await director.start('locked');
keypad?.act();
report(story.get('side_door_unlocked') === true, 'the keypad set the story variable', `${story.get('side_door_unlocked')}`);

await director.start('later');
const saveDone = async () => (await w.__save.read())?.checkpoint === 'later';
let saved = false;
for (let i = 0; i < 50 && !saved; i++) {
  saved = await saveDone();
  if (!saved) await wait(50);
}
const save = await w.__save.read();
report(saved, 'starting later saved it', `checkpoint ${save?.checkpoint}, format ${save?.format}, game ${save?.game}`);
report(Array.isArray(save?.missionData) && save.missionData.length === 0 && Array.isArray(save?.chat), 'the mission data and chat slots are there, empty', JSON.stringify({ missionData: save?.missionData, chat: save?.chat }));
report(typeof save?.story === 'string' && save.story.includes('side_door_unlocked'), "Ink's state is in it", `${save?.story.length} characters`);

// Live state, not saved: the side door shut, the ramp opened.
w.__settings.cargoRampOpen = true;
const door = sideDoor();
if (door) door.open = false;
await until(() => ship.rampAmount > 0.2, 4000);
report(ship.rampAmount > 0.2 && sideDoor()?.open === false, 'moved before the reload: the ramp opening, the side door shut', `ramp ${ship.rampAmount.toFixed(2)}, side door open ${sideDoor()?.open}`);
return results;
