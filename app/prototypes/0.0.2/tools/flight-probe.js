// The ship in flight (the flying scene, pass 1: doc/plans/features/flying-scene.md). The game's own
// mode (its story, from chapter 1). In app/prototypes/0.0.2/:
//
//     node tools/probe-01.mjs tools/flight-probe.js --game --shots .export/flight
//
// About 70 s. A new game: cutscene 1 plays (tools/cutscene-1-probe.js looks at it), a skip ends it; cutscene 2 runs out. Then `chapter-1` from the
// start: the story's `ship_flying`, the ship's noise, her outfit, the viewport open; each thing the
// flight rules lock offers its knot's prompt and says its line, and the outer doors stay shut; an
// inner door still works. Then `landed`: nothing locked, the noise off.
// Runs in the page (probe-01.mjs).

const director = w.__director(), story = w.__story(), interaction = w.__interaction();
const results = [];
const report = (ok, what, detail) => results.push(`${ok ? 'PASS' : 'FAIL'}  ${what}${detail ? `  (${detail})` : ''}`);

// Cutscene 1 after NEW GAME (a fresh profile has no save: START is a new game).
const cutscene = w.__cutscene();
await until(() => cutscene.playing, 5000);
report(cutscene.track?.id === 'cutscene-1', 'cutscene 1 plays after a new game', cutscene.track?.id);
await shot('animatic');
// Skipped by holding E for 3 s (skip-prompt.ts).
window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' }));
await until(() => !cutscene.playing, 5000);
window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE' }));
await until(() => !cutscene.playing, 2000);
report(!cutscene.playing, 'a skip ends it');
// Cutscene 2 (watched) plays after it: its own probe (opening-probe.js) looks at it; here it's let run out.
await until(() => !w.__watched()?.playing, 40000);

story.reset();
await director.start('chapter-1');
await wait(500);
report(director.current === 'chapter-1', 'chapter-1 started', director.current);
report(story.get('ship_flying') === true, 'the story knows the ship is flying', `ship_flying ${story.get('ship_flying')}`);
report(w.__settings.outfit === 'jumpsuit', 'she wears the jumpsuit', w.__settings.outfit);
const viewport = ['engineering-window-left', 'engineering-window-right'].map((id) => w.__entity(id)?.find((c) => 'open' in c));
report(viewport.every((d) => d?.open && d.amount === 1), 'the viewport is open', viewport.map((d) => d?.amount).join(', '));
await until(() => w.__audio.playing().includes('amb_ship_noise'), 5000);
report(w.__audio.playing().includes('amb_ship_noise'), "the ship's noise plays", w.__audio.playing().join(', '));
await shot('chapter-1-start');
// She starts seated (piloting-probe.js looks at it): up first, as a player would.
await until(() => !w.__dialogue.cooling && !w.__dialogue.active, 3000); // the cooldown after cutscene 2's box
window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' }));
window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE' }));
report(await until(() => w.__character.model?.seated === false, 3000), 'Get up: she stands');
await wait(800); // the use's cooldown

// Each locked thing: its prompt and its line, by its target (the interactions' list).
let heard = null;
const show = story.onLines;
story.onLines = (lines, topics) => {
  heard = lines.map((l) => `${l.speaker ?? '-'}: ${l.text}`).join(' / ');
  show?.(lines, topics);
};
const items = interaction.items;
const byId = (id) => items.find((i) => i.objects.some((o) => o.userData.id === id));
const rampBefore = w.__ship().rampAmount;
for (const [id, line] of [
  ['side-door-keypad', "It's not safe to open that right now."],
  ['cargo-ramp-keypad', "It's not safe to open that right now."],
  ['top-hatch-lower', "It's not safe to open that right now."],
  ['jetpack-1', "I don't need that right now"],
  ['green-parka', "it's too warm for that in here"],
]) {
  const item = id === 'jetpack-1' ? items.find((i) => i.objects.some((o) => /^jetpack-/.test(o.userData.id ?? ''))) : byId(id);
  if (!item) {
    report(false, `${id}: a target`, 'none');
    continue;
  }
  heard = null;
  const verb = item.verb();
  item.act();
  await wait(300);
  report(heard?.endsWith(line) ?? false, `${id}: "${verb}" says the line`, heard ?? 'nothing');
}
await wait(1500);
const side = w.__entity('side-door')?.find((c) => 'open' in c);
const hatch = w.__entity('top-hatch-lower')?.find((c) => 'open' in c);
report(!side?.open && !hatch?.open && w.__ship().rampAmount === rampBefore && !w.__settings.wearingJetpack && w.__settings.outfit === 'jumpsuit', 'nothing opened, taken or put on', `side ${side?.open}, hatch ${hatch?.open}, ramp ${w.__ship().rampAmount}, jetpack ${w.__settings.wearingJetpack}, outfit ${w.__settings.outfit}`);
const inner = byId('engineering-door-panel-front');
report(inner && !/safe|Locked/.test(inner.verb()), 'an inner door still works', inner?.verb());

// Landed: no flight rules.
await director.start('landed');
await wait(300);
report(story.get('ship_flying') === false && !w.__settings.shipFlying, 'landed: not flying', `ship_flying ${story.get('ship_flying')}`);
const pack = items.find((i) => i.objects.some((o) => /^jetpack-/.test(o.userData.id ?? '')));
heard = null;
story.onLines = (lines) => (heard = lines.length);
pack?.act();
await wait(300);
report(heard === null && w.__settings.wearingJetpack, 'landed: the jetpack is taken as usual', `wearing ${w.__settings.wearingJetpack}, lines ${heard}`);
pack?.act();
story.onLines = show;
report(!w.__entity('side-door').find((c) => 'locked' in c).locked, 'landed: the side door not locked');
return results;
