// Her two outfits (item 72, pass 1: doc/plans/features/locker-outfit.md). In app/prototypes/0.0.2/:
//
//     node tools/probe-01.mjs tools/outfit-probe.js --shots .export/outfit
//
// About 30 s. She starts in the jumpsuit; the jumpsuit's meshes are on the parka's skeleton; the
// `outfit` command swaps her in the corridor, with the jetpack on and while walking, with
// screenshots, and half-way up the ladder; the slowest frame around each swap (a shader built late stalls one); flying in each
// (the glow at the nozzles); the pipelines before and after the swaps.
// Runs in the page (probe-01.mjs).

const character = w.__character, view = w.__view, settings = w.__settings;
const model = character.model;
if (!model) return 'no model shown';
const pipelines = () => w.__renderer?._pipelines?.caches?.size ?? null;
const out = { start: settings.outfit, pipelinesAtStart: pipelines() };
const shown = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
const meshes = [];
model.object.traverse((o) => { if (o.isSkinnedMesh) meshes.push(o); });
const bones = new Set();
model.object.traverse((o) => { if (o.isBone) bones.add(o); });
out.skinned = meshes.map((m) => `${m.name}: ${m.skeleton.bones.filter((b) => bones.has(b)).length}/${m.skeleton.bones.length} of her bones`);
// The slowest frame over a while (ms).
const slowest = async (ms) => {
  let worst = 0, last = performance.now();
  const end = last + ms;
  while (performance.now() < end) {
    await new Promise((r) => requestAnimationFrame(r));
    const now = performance.now();
    worst = Math.max(worst, now - last);
    last = now;
  }
  return Math.round(worst);
};
const look = () => { view.yaw = character.facing + Math.PI; view.pitch = 0.25; };
const state = () => `${settings.outfit}: shown ${meshes.filter(shown).map((m) => m.name).join(', ')}; jetpack ${character.jetpack?.name ?? 'none'}`;
look();
await wait(2000);
out.jumpsuit = state();
await shot('1-jumpsuit');
const run = (set) => w.__outfit(set);
run('parka');
out.parkaSlowestFrame = await slowest(1500);
out.parka = state();
await shot('2-parka');
settings.wearingJetpack = true;
await wait(800);
out.parkaJetpack = state();
await shot('3-parka-jetpack');
run('jumpsuit');
out.jumpsuitSlowestFrame = await slowest(1500);
out.jumpsuitJetpack = state();
await shot('4-jumpsuit-jetpack');
// Flying in each (the glow at the nozzles): Space holds the jet.
for (const outfit of ['jumpsuit', 'parka']) {
  run(outfit);
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
  await wait(700);
  view.yaw = character.facing + Math.PI * 0.8; view.pitch = 0.1;
  await wait(500);
  out[`${outfit}Glow`] = w.__exhaust.shown;
  await shot(`7-flying-${outfit}`);
  window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' }));
  await wait(2500);
}
look();
// Walking while swapping.
window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
await wait(600);
run('parka');
await wait(400);
await shot('5-walking-parka');
run('jumpsuit');
await wait(400);
await shot('6-walking-jumpsuit');
window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' }));
settings.wearingJetpack = false;
await wait(600);
// Half-way up the ladder in each (the climbing clip on the shared skeleton).
const ladders = w.__ladders(), ladder = ladders.list[0], interaction = w.__interaction();
ladder.hatch.open = true;
for (const outfit of ['jumpsuit', 'parka']) {
  run(outfit);
  const foot = ladder.bottom.clone().addScaledVector(ladder.face, -0.5);
  w.__physics.teleport(foot); character.position.copy(foot); character.verticalVelocity = 0; character.speed = 0; character.velocity.set(0, 0, 0);
  view.yaw = Math.atan2(-ladder.face.x, -ladder.face.z); view.pitch = 0.3;
  await until(() => character.grounded && interaction.target?.name === ladder.name, 3000);
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' })); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE' }));
  await until(() => ladders.state.is === 'clip' && ladders.state.t > 1.2, 4000);
  view.yaw += 0.6;
  await wait(100);
  out[`${outfit}Climbing`] = ladders.state.is;
  await shot(`8-ladder-${outfit}`);
  await until(() => ladders.state.is === 'off', 6000);
}
out.end = state();
out.pipelinesAtEnd = pipelines();
return out;
