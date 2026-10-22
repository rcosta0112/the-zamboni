// Turns the audio masters into game files (`node tools/encode-audio.mjs`, in app/): AAC in .m4a,
// with ffmpeg (on the PATH). Masters: resources/audio/ue-prototype/ (outside git), and Part 1's
// soundtrack, which stays in Part 1's project (its folder: BMTM_AUDIO, or the path below). Game
// files: app/prototypes/0.0.2/public/test/audio/ (placeholders, so test assets). Each file's source is in SOURCES.md
// there. `--only <name>` encodes one file and leaves the others alone.
// Plans: doc/plans/features/audio-from-ue.md, start-screen.md. Names: doc/architecture/audio.md.

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PROTO = resolve(dirname(fileURLToPath(import.meta.url)), '..'); // this version's folder
const ROOT = resolve(PROTO, '..', '..', '..');
const MASTERS = resolve(ROOT, 'resources', 'audio', 'ue-prototype');
const OUT = join(PROTO, 'public', 'test', 'audio');
const PART1 = process.env.BMTM_AUDIO ?? 'C:/Users/31658/Projects/Big Moon Tiny Moon/Assets/Audio';

// [game file, the start of the master's name, bit rate, channels]. The masters are 22 kHz: the
// game files keep that rate. The boombox's tracks are in the order UE's Blueprint lists them.
const FILES = [
  ['sfx_door_slide', '244491416_nw_prev_01', '48k', 1],
  ['sfx_boombox_cassette', 'cassette-ffww-cassetera-96765_01', '64k', 2],
  ['mus_boombox_01', 'Anamanaguchi - Helix Nebula_01', '64k', 2],
  ['mus_boombox_02', 'Anamanaguchi - My Skateboard Will Go On_01', '64k', 2],
  ['mus_boombox_03', '2NRO8OT - Crash Of The First Interstellar Channel_01', '64k', 2],
  ['mus_boombox_04', '2NRO8OT - Ugol Padeniya_01', '64k', 2],
];
// The ship's noise (flying scene, pass 1; owner, 2026-10-22: one file): the two plane recordings mixed
// at the levels the game played them at (0.5 each), as long as the flight one (7:05); the landing one
// (1:34) repeated under it, each repeat crossfaded into the next. The game crossfades the file's end
// into its start (`crossfade` in cues.json), as it did for each of the two.
const NOISE = { name: 'amb_ship_noise_loop', a: 'plane_cessna152_flight-52790_01', b: 'plane-landing-23118_01', levels: [0.5, 0.5], fade: 2, bitrate: '48k' };
// [game file, the master's whole path, bit rate, channels]: masters that aren't in resources/.
// Part 1's soundtrack is 44.1 kHz and keeps it; so does its jetpack's sound (it loops). The wind is
// from the Islands project (44.1 kHz, kept): it fades in and out, so only the part between is kept
// ([from, to] in s), and the game crossfades its end into its start.
const ISLANDS = process.env.ISLANDS_AUDIO ?? 'C:/Users/31658/Projects/Islands-29a650/Assets/Audio';
const ELSEWHERE = [
  ['mus_part1_theme', join(PART1, 'Background Music.wav'), '128k', 2],
  ['sfx_jetpack_loop', join(PART1, 'Thrusters.mp3'), '64k', 2],
  ['amb_wind_loop', join(ISLANDS, 'Wind-Mark_DiAngelo-1940285615.mp3'), '64k', 2, undefined, [1, 26.5]],
];
const onlyAt = process.argv.indexOf('--only');
const ONLY = onlyAt >= 0 ? process.argv[onlyAt + 1] : null;

const masters = existsSync(MASTERS) ? readdirSync(MASTERS) : [];
mkdirSync(OUT, { recursive: true });
let failed = 0;
const found = FILES.map(([name, from, bitrate, channels]) => {
  const master = masters.find((f) => f.startsWith(from) && f.toLowerCase().endsWith('.wav'));
  return [name, master ? join(MASTERS, master) : null, bitrate, channels, `${from}*.wav`];
});
for (const [name, path, bitrate, channels, wanted, trim] of [...found, ...ELSEWHERE]) {
  if (ONLY && name !== ONLY) continue;
  if (!path || !existsSync(path)) {
    console.error(`MISSING  ${wanted ?? path} (for ${name})`);
    failed++;
    continue;
  }
  const master = basename(path);
  const out = join(OUT, `${name}.m4a`);
  // -movflags +faststart: the index first, so a streamed file starts playing before it's all here.
  const cut = trim ? ['-ss', String(trim[0]), '-to', String(trim[1])] : [];
  const run = spawnSync('ffmpeg', ['-y', '-v', 'error', '-i', path, ...cut, '-vn', '-ac', String(channels), '-c:a', 'aac', '-b:a', bitrate, '-movflags', '+faststart', out], { stdio: ['ignore', 'inherit', 'inherit'] });
  if (run.status !== 0) {
    console.error(`FAILED   ${name}`);
    failed++;
    continue;
  }
  console.log(`${name}.m4a  ${(statSync(out).size / 1024).toFixed(0)} kB  ← ${master}`);
}
if (!ONLY || ONLY === NOISE.name) {
  const [a, b] = [NOISE.a, NOISE.b].map((from) => masters.find((f) => f.startsWith(from) && f.toLowerCase().endsWith('.wav')));
  if (!a || !b) {
    console.error(`MISSING  ${!a ? NOISE.a : NOISE.b}*.wav (for ${NOISE.name})`);
    failed++;
  } else {
    const seconds = (file) => Number(spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' }).stdout);
    const [long, short] = [seconds(join(MASTERS, a)), seconds(join(MASTERS, b))];
    const copies = Math.ceil((long - NOISE.fade) / (short - NOISE.fade)) + 1;
    // Input 0 the flight sound, 1..copies the landing one; the landing copies chained by crossfades.
    const inputs = ['-i', join(MASTERS, a), ...Array.from({ length: copies }, () => ['-i', join(MASTERS, b)]).flat()];
    const chain = [];
    let last = '1:a';
    for (let i = 2; i <= copies; i++) {
      chain.push(`[${last}][${i}:a]acrossfade=d=${NOISE.fade}:c1=qsin:c2=qsin[b${i}]`);
      last = `b${i}`;
    }
    const filter = [...chain, `[0:a]volume=${NOISE.levels[0]}[x]`, `[${last}]atrim=0:${long},volume=${NOISE.levels[1]}[y]`, '[x][y]amix=inputs=2:duration=first:normalize=0[out]'].join(';');
    const out = join(OUT, `${NOISE.name}.m4a`);
    const run = spawnSync('ffmpeg', ['-y', '-v', 'error', ...inputs, '-filter_complex', filter, '-map', '[out]', '-ac', '1', '-c:a', 'aac', '-b:a', NOISE.bitrate, '-movflags', '+faststart', out], { stdio: ['ignore', 'inherit', 'inherit'] });
    if (run.status !== 0) {
      console.error(`FAILED   ${NOISE.name}`);
      failed++;
    } else console.log(`${NOISE.name}.m4a  ${(statSync(out).size / 1024).toFixed(0)} kB  ← ${a} + ${b} (${copies} times)`);
  }
}
process.exit(failed === 0 ? 0 : 1);
