// The landed scene, reached by sitting back down (doc/plans/features/landed-scene.md). The game's own mode:
//
//     node tools/probe-01.mjs tools/landed-probe.js --game --query scene=chapter-1 --shots .export/landed
//
// About 40 s. Chapter 1 starts her seated: Adam's line, *Get up*, her line; her seat then offers *Sit
// down*: E seats her, the conversation before the landing plays (still chapter 1), then the landing shot (the treadmill stopped, the ship coming down onto it, its flames on, the gear lowering), the
// landed scene under it; at its end she's seated, *Get up* says nothing; nothing is locked; outside she
// stands on the terrain's hills; the rocks cast into the shadow map, the nearest ones collide.
// Runs in the page (probe-01.mjs).

const results = [];
const report = (ok, what, detail) => results.push(`${ok ? 'PASS' : 'FAIL'}  ${what}${detail ? `  (${detail})` : ''}`);
const character = w.__character, dialogue = w.__dialogue, THREE = w.__THREE;
const key = (code) => {
  window.dispatchEvent(new KeyboardEvent('keydown', { code }));
  window.dispatchEvent(new KeyboardEvent('keyup', { code }));
};
const prompt = () => (document.querySelector('#prompt').hidden ? '' : document.querySelector('#prompt').textContent.trim());
const endLines = async () => {
  while (dialogue.line) {
    dialogue.end();
    await wait(100);
  }
  await until(() => !dialogue.cooling, 3000);
};

await until(() => w.__director()?.current === 'chapter-1' && dialogue.line, 10000);
await endLines();
await until(() => /Get up/.test(prompt()), 3000);
key('KeyE');
await until(() => character.model?.seated === false, 3000);
const line = await until(() => dialogue.line, 3000);
report(line && /stretch my legs/.test(dialogue.line.text), 'chapter 1: her line as she gets up', dialogue.line?.text);
await endLines();
const offered = await until(() => /Sit down/.test(prompt()), 3000);
report(offered, 'her seat offers Sit down once she is up', prompt());
key('KeyE');
// The conversation before the landing first (the scene's `before`), still in chapter 1, the plain going by.
const talking = await until(() => w.__watched()?.playing, 5000);
const moving = w.__treadmill().travelled;
await wait(500);
report(talking && w.__director().current === 'chapter-1' && w.__treadmill().travelled > moving, 'Sit down: the conversation before the landing plays first, in chapter 1, the plain going by', `${w.__director().current}, moved ${(w.__treadmill().travelled - moving).toFixed(1)} m`);
const firstLine = await until(() => dialogue.line, 8000); // after the wide shot's hold
report(firstLine && w.__watched().speaker === 'opening', 'the conversation: its opening shot kept through the first line (until Adam Red speaks)', `${w.__watched().speaker}; ${dialogue.line?.id}: ${dialogue.line?.text}`);
report(w.__scene.children.some((o) => o.visible && o.renderOrder === 10 && o.isMesh), 'the column of light shown', '');
await shot('whats-that');
await endLines();
const playing = await until(() => w.__cutscene().playing && w.__cutscene().track?.id === 'landing', 5000);
report(playing && w.__director().current === 'landed', 'Sit down: the landing shot plays, the landed scene under it', `${w.__cutscene().track?.id}, ${w.__director().current}`);
const t = w.__treadmill();
await wait(1500);
const at = t.travelled;
await wait(1000);
report(t.parkedAt === 14697 && t.travelled === at && t.group.visible, 'the treadmill is shown, stopped at the spot', `parked at ${t.parkedAt}, moved ${(t.travelled - at).toFixed(2)} m in 1 s`);
const flying = w.__cutscene().flight;
report(w.__flames().mesh.visible && !w.__settings.shipFlying && flying?.gear === 1, 'the landing: the ship comes down flying (the track keys flames, gear up), the landed scene not flying', JSON.stringify(flying));
report(w.__ship().object.position.y > w.__cutscene()['rest'].position.y + 5, 'the landing: the ship high over its landed place', `${(w.__ship().object.position.y - w.__cutscene()['rest'].position.y).toFixed(1)} m up`);
await shot('landing-shot');
await until(() => !w.__cutscene().playing, 12000);
await wait(500);
report(character.model?.seated === true, 'landed: she is seated when the shot ends');
report(!w.__flames().mesh.visible && w.__ship().gearRaised === null, 'landed: no flames, the gear as the scene has it (down)');
await until(() => /Get up/.test(prompt()), 3000);
key('KeyE');
await until(() => character.model?.seated === false, 3000);
await wait(800);
report(!dialogue.line, 'landed: Get up says nothing (chapter 1’s line is chapter 1’s)', dialogue.line?.text);
const locked = (id) => w.__entity(id)?.find((c) => 'locked' in c)?.locked;
report(['side-door', 'cargo-ramp', 'top-hatch-lower', 'top-hatch-upper'].every((id) => locked(id) === false), 'landed: the outer doors and hatches unlocked', ['side-door', 'cargo-ramp', 'top-hatch-lower', 'top-hatch-upper'].map((id) => `${id} ${locked(id)}`).join(', '));
report(/Sit down/.test(prompt()) === false, 'landed: no Sit down (the scene says nothing about it)');
// Outside: 25 m ahead of the ship's nose, dropped from 3 m above the ground there.
const s = w.__ship();
const spot = s.object.localToWorld(new THREE.Vector3(14, 0, 30)); // Blender (14, -30)
const ground = t.groundY(spot.x, spot.z);
w.__physics.teleport(spot.clone().setY(ground + 3));
character.position.copy(spot).setY(ground + 3);
character.verticalVelocity = 0;
await until(() => !character.grounded, 1000); // falling (she was grounded inside)
await until(() => character.grounded, 4000);
await wait(500);
report(character.grounded && Math.abs(character.position.y - ground) < 0.1, 'outside she stands on the hills, not the flat ground', `feet ${character.position.y.toFixed(2)}, the hills ${ground.toFixed(2)} there`);
await wait(1500);
await shot('outside');
// The rocks (2026-11-06): all cast real shadows while parked; the nearest ones collide.
const casting = [];
w.__scene.traverse((o) => { if (o.isInstancedMesh && o.castShadow) casting.push(o); });
report(casting.length > 0, 'parked: the rocks cast into the shadow map', `${casting.length} meshes`);
const near = t.nearRocks.map((m) => new THREE.Box3().setFromObject(m)).sort((a, b) => b.getSize(new THREE.Vector3()).y - a.getSize(new THREE.Vector3()).y)[0];
const middle = near?.getCenter(new THREE.Vector3());
report(near && !w.__physics.fits(middle.setY(t.groundY(middle.x, middle.z) + 0.3)), 'the biggest rock near the ship collides', `${t.nearRocks.length} rocks within 500 m`);
return results;
