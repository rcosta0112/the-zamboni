// The coffee (doc/plans/features/coffee.md, pass 2). The game's own mode, from chapter 1:
//
//     node tools/probe-01.mjs tools/coffee-probe.js --game --query scene=chapter-1 --shots .export/coffee
//
// About 60 s. She gets up; the cup in the sink hidden; *Sit down* gives her line (no coffee yet); at
// the pot, *Pour coffee* (aimed, the prompt): the mug in her hand, no gadgets (1 does nothing), no
// sink cup yet; sips at random (the gap set to 1–1.5 s here); she can run with it (W held); she still
// sips while talking; the ladder hides the mug through the climb; *Put cup in sink*: the mug gone, the cup in the sink, Ink
// `green_coffee` "sink"; the pot again: her line; *Sit down*: on to the landed scene, where the pot
// gives "No time for that now." and the cup is still in the sink. Runs in the page (probe-01.mjs).

const results = [];
const report = (ok, what, detail) => results.push(`${ok ? 'PASS' : 'FAIL'}  ${what}${detail ? `  (${detail})` : ''}`);
const character = w.__character, dialogue = w.__dialogue, physics = w.__physics, view = w.__view, coffee = w.__coffee();
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
const item = (verb) => w.__interaction().items.find((i) => { try { return i.verb() === verb; } catch { return false; } });
const lineOf = async () => ((await until(() => dialogue.line, 3000)) ? dialogue.line.text : '(no line)');
const mug = () => character.model?.object.getObjectByName('Mug');
const sinkCup = () => w.__entity('sink-cup')?.object;
if (!coffee) return ['FAIL  no __coffee()'];

await until(() => w.__director()?.current === 'chapter-1' && dialogue.line, 10000);
await endLines();
await until(() => /Get up/.test(prompt()), 3000);
key('KeyE');
await until(() => character.model?.seated === false, 3000);
await until(() => dialogue.line, 3000);
await endLines();
report(coffee.state === 'none' && sinkCup()?.visible === false && mug()?.visible === false, 'a new chapter 1: no coffee, the sink cup hidden, no mug', `${coffee.state}, sink cup ${sinkCup()?.visible}, mug ${mug()?.visible}`);

const sit = item('Sit down');
sit?.act();
const refusal = await lineOf();
report(refusal === 'I want some coffee first.' && character.model?.seated === false, 'Sit down before a coffee: her line, she stays up', refusal);
await endLines();

// At the pot, aimed: the prompt.
const pot = interactionItem('coffee-pot');
function interactionItem(id) { return w.__interaction().items.find((i) => i.objects[0]?.userData.id === id); }
const DOWN = new T.Vector3(0, -1, 0);
const aimAt = async (target) => {
  const centre = new T.Box3().setFromObject(target.objects[0]).getCenter(new T.Vector3());
  for (let r = 0.4; r < 1.4; r += 0.15)
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const at = centre.clone().add(new T.Vector3(Math.sin(a) * r, 0, Math.cos(a) * r));
      const hit = physics.ray(at, DOWN, 2.5, true);
      if (!hit) continue;
      const spot = at.clone().setY(at.y - hit.distance + 0.02);
      if (!physics.fits(spot)) continue;
      physics.teleport(spot); character.position.copy(spot); character.verticalVelocity = 0; character.speed = 0; character.velocity.set(0, 0, 0);
      character.facing = Math.atan2(-(centre.x - spot.x), -(centre.z - spot.z));
      view.yaw = character.facing + 0.4; view.pitch = 0.25;
      await wait(350);
      if (w.__interaction().target === target) return spot;
    }
  return null;
};
const potSpot = pot && (await aimAt(pot));
report(Boolean(potSpot), 'she can aim at the pot', potSpot ? potSpot.toArray().map((v) => v.toFixed(2)).join(', ') : `pot ${Boolean(pot)}, target ${w.__interaction().target?.name}`);
await wait(800);
report(/Pour coffee/.test(prompt()), 'the pot\'s prompt', prompt());
await shot('1-at-the-pot');
w.__settings.coffeeSipMin = 1; w.__settings.coffeeSipMax = 1.5; // sips 1–1.5 s apart here
key('KeyE');
await until(() => coffee.state === 'holding', 2000);
await wait(600);
report(coffee.state === 'holding' && mug()?.visible === true && w.__story().get('green_coffee') === 'holding', 'Pour coffee: the mug in her hand (Ink "holding")', `${coffee.state}, mug ${mug()?.visible}, Ink ${w.__story().get('green_coffee')}`);
report(pot.available() === false, 'holding: the pot not offered', '');
await shot('2-holding');

// No gadgets.
key('Digit1');
await wait(400);
report(w.__gadgets.out === null && w.__gadgets.held === 0, 'holding: 1 (the binoculars) does nothing', `out ${w.__gadgets.out}`);

// Sips (1–1.5 s apart here).
const sips0 = coffee.sips;
let sawSip = false;
for (let i = 0; i < 60; i++) {
  await wait(100);
  if (!sawSip && coffee.sipping && coffee.sip > 0.35 && coffee.sip < 0.55) { sawSip = true; await shot('3-a-sip'); }
}
report(coffee.sips - sips0 >= 1 && sawSip, 'sips at random while she stands', `${coffee.sips - sips0} in 6 s (each ${(character.model?.coffeeSeconds ?? 0).toFixed(2)} s)`);

// Running with it (owner, 2026-11-18: no restriction): W held for 2 s (keyboard: running unless Shift).
let fastest = 0;
window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
for (let i = 0; i < 20; i++) { await wait(100); fastest = Math.max(fastest, character.speed); }
window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' }));
report(fastest > character.walkSpeed() + 0.5, 'holding: she can run', `fastest ${fastest.toFixed(2)} m/s, walk ${character.walkSpeed()}, run ${character.runSpeed()}`);
await wait(500);

// Talking (owner, 2026-11-18): she still sips. Dr. Kaufman's conversation, the line left open.
const kaufman = interactionItem('kaufman');
kaufman?.act();
await until(() => dialogue.line, 3000);
const sipsTalking = coffee.sips;
let talkingAll = true;
for (let i = 0; i < 40; i++) { await wait(100); if (!dialogue.line) talkingAll = false; }
report(kaufman && talkingAll && coffee.sips > sipsTalking, 'talking: she still sips', `kaufman ${Boolean(kaufman)}, the line open throughout ${talkingAll}, ${coffee.sips - sipsTalking} sip(s) in 4 s`);
await endLines();

// The ladder (owner, 2026-11-18): the mug gone while the climbing animation plays, back after it.
{
  const ladders = w.__ladders(), ladder = ladders.list[0];
  const put = (p) => { physics.teleport(p); character.position.copy(p); character.verticalVelocity = 0; character.speed = 0; character.velocity.set(0, 0, 0); };
  put(ladder.bottom.clone().addScaledVector(ladder.face, -0.5).add(new T.Vector3(0, 0.05, 0)));
  await until(() => character.grounded, 2000);
  await wait(300);
  let frames = 0, shownWhileClimbing = 0, sippedWhileClimbing = 0, seen = false;
  ladders.interactables[0].act();
  await new Promise((resolve) => {
    const tick = () => {
      if (ladders.state.is === 'clip') {
        seen = true;
        frames++;
        if (mug()?.visible) shownWhileClimbing++;
        if (coffee.sipShare > 0) sippedWhileClimbing++;
      }
      if (ladders.state.is === 'off' && seen) return resolve();
      requestAnimationFrame(tick);
    };
    tick();
    setTimeout(resolve, 15000);
  });
  await wait(300);
  report(seen && frames > 10 && shownWhileClimbing === 0 && sippedWhileClimbing === 0 && mug()?.visible === true && coffee.state === 'holding', 'the ladder: the mug hidden through the climb, back after it', `${frames} frames climbing, mug shown in ${shownWhileClimbing}, sipping in ${sippedWhileClimbing}; after: mug ${mug()?.visible}, ${coffee.state}`);
}

// The sink.
const sink = interactionItem('sink-cup');
const sinkSpot = sink && (await aimAt(sink));
report(Boolean(sinkSpot), 'she can aim at the sink', sinkSpot ? '' : `sink ${Boolean(sink)}, target ${w.__interaction().target?.name}`);
await wait(800);
report(/Put cup in sink/.test(prompt()), "the sink's prompt", prompt());
await shot('4-at-the-sink');
key('KeyE');
await until(() => coffee.state === 'sink', 2000);
await wait(400);
report(
  coffee.state === 'sink' && sinkCup()?.visible === true && mug()?.visible === false && w.__story().get('green_coffee') === 'sink',
  'Put cup in sink: the mug gone, the cup in the sink (Ink "sink")',
  `${coffee.state}, sink cup ${sinkCup()?.visible}, mug ${mug()?.visible}`,
);
await shot('5-cup-in-sink');
pot.act();
const again = await lineOf();
report(again === "That's enough coffee for now. Better get back to work." && coffee.state === 'sink', 'the pot again: her line', again);
await endLines();

// Sit down: on to the landed scene.
item('Sit down')?.act();
for (let i = 0; i < 600 && !(w.__director().current === 'landed' && !w.__cutscene().playing && !w.__watched()?.playing); i++) {
  if (dialogue.line) dialogue.end();
  await wait(100);
}
await endLines();
await wait(500);
report(w.__director().current === 'landed' && sinkCup()?.visible === true && mug()?.visible === false, 'landed: the cup still in the sink, no mug', `${w.__director().current}, ${coffee.state}`);
pot.act();
const landed = await lineOf();
report(landed === 'No time for that now.', 'landed: the pot gives her line', landed);
await endLines();
return results;

