// Changing clothes at her locker, after the reload (locker-probe.js): *Continue* dresses her in the
// parka and puts the sneakers in her locker; *Take off parka* there puts the jumpsuit back on.
// Runs in the page (probe-01.mjs); clears the save at the end.

const results = [];
const report = (ok, name, detail) => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `: ${detail}` : ''}`);
const interaction = w.__interaction();
const shown = (id) => w.__entity(id)?.object.visible;
const parka = interaction.items.find((i) => i.objects[0]?.userData.id === 'green-parka');
const door = w.__entity('crew-locker-door-1')?.components[0];
await wait(300);
report(w.__start().shown === 'continue', 'CONTINUE', `shown ${w.__start().shown}`);
report(w.__settings.outfit === 'parka' && !shown('green-parka') && shown('green-sneakers-left'), 'continued in the parka; the sneakers in her locker', `${w.__settings.outfit}; parka in locker ${shown('green-parka')}, sneakers ${shown('green-sneakers-left')}`);
door.open = true;
await until(() => door.amount === 1, 3000);
report(parka.verb() === 'Take off parka', '"Take off parka"', parka.verb());
parka.act();
await wait(300);
report(w.__settings.outfit === 'jumpsuit' && w.__story().get('green_outfit') === 'jumpsuit' && shown('green-parka') && shown('green-boot-right') && !shown('green-sneakers-right'), 'taken off: the jumpsuit on; the parka and boots back', `${w.__settings.outfit}, Ink ${w.__story().get('green_outfit')}`);
await w.__save.clear();
return results;
