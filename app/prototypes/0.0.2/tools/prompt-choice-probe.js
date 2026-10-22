// Which prompt, and the circles (item 56, pass 2: doc/plans/features/prompt-choice.md). In app/prototypes/0.0.2/:
//
//     node tools/probe-01.mjs tools/prompt-choice-probe.js --shots .export/prompt-choice
//
// At the owner's spot by her locker (2026-10-22: feet 3.668, 3.462, -14.043; yaw -3.064; pitch
// 0.578), facing the locker: the locker open, then shut; then turned away. The last moved aims: the
// camera turned to the parka, then she turned to the door. By the cockpit doorway (the owner's spot,
// 2026-10-22): no circle on Adam in the cockpit. At the rack: only hers (bottom right), one dot over it.
// The target, its prompt and the circles at each, with screenshots. Runs in the page (probe-01.mjs).

const physics = w.__physics, character = w.__character, view = w.__view, interaction = w.__interaction();
const prompt = document.querySelector('#prompt');
const door = w.__entity('crew-locker-door-1').components[0];
const parka = w.__entity('green-parka').object;
const feet = new T.Vector3(3.668, 3.462, -14.043);
physics.teleport(feet); character.position.copy(feet); character.velocity.set(0, 0, 0); character.speed = 0;
const c = new T.Box3().setFromObject(parka).getCenter(new T.Vector3());
const faceParka = Math.atan2(-(c.x - feet.x), -(c.z - feet.z));
const at = async (label, facing) => {
  character.facing = facing;
  view.yaw = -3.064; view.pitch = 0.578;
  await wait(900);
  await shot(label);
  return `${label}: target ${interaction.target?.name ?? '-'} "${prompt.hidden ? '' : prompt.textContent}"; circles: ${interaction.marked.join(', ') || '-'}`;
};
const rows = [];
door.open = true; await until(() => door.amount === 1, 3000);
rows.push(await at('1-open', faceParka));
door.open = false; await until(() => door.amount === 0, 3000);
rows.push(await at('2-shut', faceParka));
rows.push(await at('3-turned-away', faceParka + Math.PI));

// The last moved aims: her facing toward the door's handle side, then the camera on the parka.
door.open = true; await until(() => door.amount === 1, 3000);
const handle = new T.Box3().setFromObject(door.object ?? w.__entity('crew-locker-door-1').object).getCenter(new T.Vector3());
character.facing = Math.atan2(-(handle.x - feet.x), -(handle.z - feet.z));
await wait(600);
rows.push(`facing the door (aims: ${interaction.aimBy}): ${interaction.target?.name ?? '-'}`);
view.yaw = faceParka; view.pitch = 0.578;
await wait(600);
rows.push(`then the camera on the parka (aims: ${interaction.aimBy}): ${interaction.target?.name ?? '-'}`);
character.facing = Math.atan2(-(handle.x - feet.x), -(handle.z - feet.z)) + 0.05;
await wait(600);
rows.push(`then she turns a little (aims: ${interaction.aimBy}): ${interaction.target?.name ?? '-'}`);
await shot('4-aim-by-facing');

// By the cockpit doorway: Adam (Red) is in the cockpit.
for (const id of ['cockpit-door-left', 'cockpit-door-right']) { const d = w.__entity(id)?.components[0]; if (d) d.open = true; }
const doorway = new T.Vector3(4.374, 3.462, -16.768);
physics.teleport(doorway); character.position.copy(doorway); character.velocity.set(0, 0, 0);
view.yaw = 5.577; view.pitch = 0.205; character.facing = 5.577;
await wait(1200);
rows.push(`by the cockpit doorway: target ${interaction.target?.name ?? '-'}; circles: ${interaction.marked.join(', ') || '-'}`);
await shot('5-cockpit-doorway');

// The rack: facing it, then turned 80° (nothing aimed): one circle, the top right jetpack's.
const rack = w.__rack();
const rc = rack.slots.reduce((a, s) => a.add(new T.Box3().setFromObject(s).getCenter(new T.Vector3())), new T.Vector3()).divideScalar(rack.slots.length);
const stand = new T.Vector3(rc.x - 0.75, 1.24, rc.z);
const floor = physics.ray(stand.clone().setY(rc.y), new T.Vector3(0, -1, 0), 3, true);
stand.y = rc.y - (floor?.distance ?? 1) + 0.02;
physics.teleport(stand); character.position.copy(stand); character.velocity.set(0, 0, 0);
const toRack = Math.atan2(-(rc.x - stand.x), -(rc.z - stand.z));
character.facing = toRack; view.yaw = toRack; view.pitch = 0.2;
await wait(1200);
rows.push(`at the rack: target ${interaction.target?.name ?? '-'}; circles: ${interaction.marked.join(', ') || '-'}; hers ${rack.hers?.userData.id}`);
// Turned 80° away, the camera's cone narrowed (from 2 m behind her it still sees the rack): nothing aimed at.
const keep = w.__settings.interactMaxAngleDeg;
w.__settings.interactMaxAngleDeg = 3;
character.facing = toRack + 1.4; view.yaw = toRack + 1.4;
await wait(1200);
rows.push(`turned away from the rack: target ${interaction.target?.name ?? '-'}; circles: ${interaction.marked.join(', ') || '-'}`);
await shot('6-rack-circle');
w.__settings.interactMaxAngleDeg = keep;
return rows;
