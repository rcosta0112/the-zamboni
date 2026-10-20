// The cutscene player (the game's structure, pass 5): plays `test-ship-shots`, a screenshot in each
// shot, then checks the hand-back (she stands where she stood, the game's camera where it was, the
// see-through back); plays it again and skips it. In app/:
//
//     npm run probe -- tools/cutscene-probe.js
//     node tools/probe-01.mjs tools/cutscene-probe.js --shots <folder>    (a screenshot per shot, and the hand-back)
//
// Returns one "PASS …" / "FAIL …" line per check. Runs in the page (probe-01.mjs): `w`, `ship`, `wait`, `until`, `shot`.

const results = [];
const report = (ok, name, detail) => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `: ${detail}` : ''}`);
const fmt = (v) => `${v.x.toFixed(2)}, ${v.y.toFixed(2)}, ${v.z.toFixed(2)}`;
const player = w.__cutscene();
report(Boolean(player), 'the cutscene player is there', player ? '' : 'no __cutscene()');
if (!player) return results;

await wait(1000);
const feet = w.__character.position.clone();
const camera = w.__view.camera.position.clone();
await player.play('test-ship-shots');
report(player.playing, 'test-ship-shots plays', `track ${player.track?.id}`);
for (const [t, name] of [[1.5, 'shot-1'], [4.5, 'shot-2'], [7.5, 'shot-3']]) {
  await until(() => player.time >= t, 15000);
  await shot(`cutscene-${name}`);
  report(player.playing && w.__cut().holeAmount === 0, `${name}: playing, the see-through off`, `t ${player.time.toFixed(2)}, hole ${w.__cut().holeAmount}, camera ${fmt(player.camera.position)}`);
}
await until(() => !player.playing, 15000);
await wait(500);
await shot('cutscene-after');
const moved = w.__character.position.distanceTo(feet);
report(!player.playing, 'it ends by itself', `t ${player.time.toFixed(2)}`);
report(moved < 0.05, 'she stands where she stood', `moved ${moved.toFixed(3)}`);
report(w.__view.camera.position.distanceTo(camera) < 0.3, "the game's camera is back where it was", `${fmt(w.__view.camera.position)} vs ${fmt(camera)}`);

await player.play('test-ship-shots');
await until(() => player.time >= 1, 5000);
player.skip();
await wait(200);
report(!player.playing, 'skip ends it at once', `t ${player.time.toFixed(2)}`);
return results;
