// Flight shots in the game (doc/plans/features/flight-shots.md, pass 3): random play, a saved shot by name, the
// memory of recent shots and its place in the save. random-shot-probe-after.js, after the reload, continues:
//
//     npm run probe -- tools/random-shot-probe.js --reload tools/random-shot-probe-after.js
//
// Runs in the page (probe-01.mjs, the checks' game: saving on): `w`, `wait`, `until`.

const results = [];
const report = (ok, what, detail) => results.push(`${ok ? 'PASS' : 'FAIL'}  ${what}${detail ? `  (${detail})` : ''}`);
const player = w.__cutscene();
const memory = () => w.__save.recentShots();
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
await until(() => w.__start().begun, 10000);

report(memory().length === 0, 'a new game: no shots remembered', memory().length);
await player.play('shot: random flyby');
const first = player.track;
report(player.playing && /^random flyby \d+$/.test(first?.shot ?? '') && first.shots[0].camera.length > 2, 'random flyby: a generated shot plays', first?.shot);
report(!!first?.buckets?.sun && same(memory()[0], first.buckets), 'its buckets remembered, the sun’s too', JSON.stringify(first?.buckets));
await player.load('shot: random flyby');
await player.play('shot: random flyby');
const second = player.track;
report(second !== first && second.shot !== first.shot, 'random again: another draw', `${first.shot} → ${second?.shot}`);
await player.play('shot: 0400');
report(player.track?.shot === '0400' && player.track.duration === 7.5, 'a saved shot by name: shot: 0400', `${player.track?.shot}, ${player.track?.duration} s`);
await player.play('flyby');
report(player.track?.shot === '0400', 'the flyby (0400) built from its saved shot', player.track?.shot);
report(memory().length === 4 && same(memory()[3], first.buckets) && same(memory()[2], second.buckets), 'the memory: four shots, newest first', memory().length);
player.skip();
let save = null;
for (let i = 0; i < 50 && save?.recentShots?.length !== 4; i++, await wait(100)) save = await w.__save.read();
report(same(save?.recentShots, memory()), 'the save holds the memory (written at the cutscene’s end)', save?.recentShots?.length);
localStorage.setItem('random-shot-probe', JSON.stringify(memory()));
return results;
