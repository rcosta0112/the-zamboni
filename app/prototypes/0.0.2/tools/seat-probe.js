// Her remark on the pilot's seat (the dialogue plan, pass 1, part B: doc/plans/features/dialogue.md). In
// app/prototypes/0.0.2/:
//
//     node tools/probe-01.mjs tools/seat-probe.js --shots .export/seat
//
// About 30 s. She stands by the seat (`cockpit-seat-pilot`, kind `seat`), facing it, until it's the
// target: the prompt (the knot's `# verb:`); E runs `use_cockpit_seat_pilot` (her line in the box);
// presses end it; the prompt is back a second later. Screenshots of the prompt and the line.
// Runs in the page (probe-01.mjs).

const physics = w.__physics, character = w.__character, view = w.__view;
const interaction = w.__interaction(), dialogue = w.__dialogue;
const prompt = document.querySelector('#prompt');
const DOWN = new T.Vector3(0, -1, 0);
const put = (p) => { physics.teleport(p); character.position.copy(p); character.verticalVelocity = 0; character.speed = 0; character.velocity.set(0, 0, 0); };
const press = async () => { window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' })); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE' })); await wait(250); };
const root = w.__entity('cockpit-seat-pilot')?.object;
if (!root) return 'no seat entity';
const box = new T.Box3().setFromObject(root);
const centre = box.getCenter(new T.Vector3());
let feet = null, tried = 0, seen = [];
for (let r = 0.2; r < 1.4 && !feet; r += 0.1) {
  for (let i = 0; i < 16 && !feet; i++) {
    const a = (i / 16) * Math.PI * 2;
    const dir = new T.Vector3(Math.sin(a), 0, Math.cos(a));
    const half = Math.abs(dir.x) * (box.max.x - box.min.x) / 2 + Math.abs(dir.z) * (box.max.z - box.min.z) / 2;
    const at = centre.clone().addScaledVector(dir, half + r); at.y = box.max.y + 0.5;
    const hit = physics.ray(at, DOWN, 3, true);
    if (!hit) continue;
    const spot = at.clone().setY(at.y - hit.distance + 0.02);
    if (spot.y < box.min.y - 0.3 || !physics.fits(spot)) continue;
    put(spot);
    character.facing = Math.atan2(-(centre.x - spot.x), -(centre.z - spot.z));
    view.yaw = character.facing + 0.3; view.pitch = 0.3;
    tried++;
    await wait(400);
    seen.push(interaction.target?.name ?? '-');
    if (interaction.target?.name === root.name) feet = spot;
  }
}
if (!feet) return `not the target from ${tried} places; targets seen: ${[...new Set(seen)].join(', ')}; seat box ${box.min.toArray().map(v=>v.toFixed(2))} .. ${box.max.toArray().map(v=>v.toFixed(2))}`;
await wait(1600);
const said = prompt.hidden ? '(no prompt)' : prompt.textContent;
await shot('seat-prompt');
await press();
const first = dialogue.line;
await press();
await shot('seat-done');
let n = 0; while (dialogue.active && n < 6) { await press(); n++; }
await wait(1200);
return `from ${feet.toArray().map(v=>v.toFixed(2))} (${tried} tried): prompt "${said}"; line "${first?.speaker}: ${first?.text}"; ended after ${n}; active ${dialogue.active}; prompt back "${prompt.hidden ? '' : prompt.textContent}"`;
