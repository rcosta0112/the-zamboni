// Changing clothes at her locker (item 72, pass 2: doc/plans/features/locker-outfit.md), before the
// reload: she starts in the jumpsuit (the parka and boots in her locker, not the sneakers); the
// parka isn't offered while the locker is shut; open, she's placed where the parka is the target,
// *Put on parka* (E) dresses her and swaps what's in the locker; a scene start saves it.
// locker-probe-after.js, after the reload, continues. In app/prototypes/0.0.2/:
//
//     node tools/probe-01.mjs tools/locker-probe.js --reload tools/locker-probe-after.js --shots .export/locker
//
// Returns one "PASS …" / "FAIL …" line per check. Runs in the page (probe-01.mjs).

const results = [];
const report = (ok, name, detail) => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `: ${detail}` : ''}`);
const physics = w.__physics, character = w.__character, view = w.__view, interaction = w.__interaction();
const shown = (id) => w.__entity(id)?.object.visible;
const inLocker = () => ['green-parka', 'green-boot-left', 'green-boot-right', 'green-sneakers-left', 'green-sneakers-right'].map((id) => `${id.slice(6)} ${shown(id) ? 'in' : 'out'}`).join(', ');
const parka = interaction.items.find((i) => i.objects[0]?.userData.id === 'green-parka');
const door = w.__entity('crew-locker-door-1')?.components[0];
if (!parka || !door) return [`FAIL  no parka target (${Boolean(parka)}) or no locker door (${Boolean(door)})`];

report(w.__settings.outfit === 'jumpsuit' && w.__story().get('green_outfit') === 'jumpsuit' && shown('green-parka') && shown('green-boot-left') && !shown('green-sneakers-left'), 'a new game: the jumpsuit on; the parka and boots in her locker', `${w.__settings.outfit}; ${inLocker()}`);
door.open = false;
await until(() => door.amount === 0, 3000);
report(parka.available() === false, 'her locker shut: the parka not offered', '');
door.open = true;
await until(() => door.amount === 1, 3000);
report(parka.available() === true && parka.verb() === 'Put on parka', 'open: offered, "Put on parka"', parka.verb());

// Where the parka is her target: in front of the locker, facing it.
const DOWN = new T.Vector3(0, -1, 0);
const box = new T.Box3().setFromObject(parka.objects[0]);
const centre = box.getCenter(new T.Vector3());
let feet = null, seen = [];
for (let r = 0.3; r < 1.4 && !feet; r += 0.15) {
  for (let i = 0; i < 16 && !feet; i++) {
    const a = (i / 16) * Math.PI * 2;
    const at = centre.clone().add(new T.Vector3(Math.sin(a) * r, 0, Math.cos(a) * r));
    const hit = physics.ray(at, DOWN, 2.5, true);
    if (!hit) continue;
    const spot = at.clone().setY(at.y - hit.distance + 0.02);
    if (!physics.fits(spot)) continue;
    physics.teleport(spot); character.position.copy(spot); character.verticalVelocity = 0; character.speed = 0; character.velocity.set(0, 0, 0);
    character.facing = Math.atan2(-(centre.x - spot.x), -(centre.z - spot.z));
    view.yaw = character.facing + 0.4; view.pitch = 0.25;
    await wait(400);
    seen.push(interaction.target?.name ?? '-');
    if (interaction.target === parka) feet = spot;
  }
}
report(Boolean(feet), 'she can aim at the parka', feet ? `from ${feet.toArray().map((v) => v.toFixed(2))}` : `targets seen: ${[...new Set(seen)].join(', ')}`);
await wait(1200);
const prompt = document.querySelector('#prompt');
report(!prompt.hidden && /Put on parka/.test(prompt.textContent), 'the prompt', prompt.hidden ? '(none)' : prompt.textContent);
await shot('1-jumpsuit-at-locker');
window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' })); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE' }));
await until(() => w.__settings.outfit === 'parka', 2000);
await wait(500);
report(w.__settings.outfit === 'parka' && w.__story().get('green_outfit') === 'parka' && !shown('green-parka') && !shown('green-boot-left') && shown('green-sneakers-left') && shown('green-sneakers-right'), 'E: the parka on (Ink too); the sneakers in her locker, the parka and boots not', `${w.__settings.outfit}, Ink ${w.__story().get('green_outfit')}; ${inLocker()}`);
report(parka.verb() === 'Take off parka', 'then "Take off parka"', parka.verb());
await shot('2-parka-on');

// A checkpoint: the scene starts again (and saves).
const director = w.__director();
await director.start(director.current);
let saved = false;
for (let i = 0; i < 50 && !saved; i++) {
  saved = /green_outfit[^,]*parka/.test((await w.__save.read())?.story ?? '');
  if (!saved) await wait(50);
}
report(saved, 'a scene start saved it: green_outfit "parka" in the save', '');
return results;
