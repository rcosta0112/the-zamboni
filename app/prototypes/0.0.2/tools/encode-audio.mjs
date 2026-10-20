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
  ['amb_ship_noise_a_loop', 'plane_cessna152_flight-52790_01', '48k', 1],
  ['amb_ship_noise_b_loop', 'plane-landing-23118_01', '48k', 1],
];
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
process.exit(failed === 0 ? 0 : 1);
