// Turns the audio masters into game files (`node tools/encode-audio.mjs`, in app/): AAC in .m4a,
// with ffmpeg (on the PATH). Masters: resources/audio/ue-prototype/ (outside git). Game files:
// app/assets/test/audio/ (placeholders, so test assets). Each file's source is in SOURCES.md there.
// Plan: doc/plans/features/audio-from-ue.md. Names: doc/architecture/audio.md.

import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MASTERS = resolve(APP, '..', 'resources', 'audio', 'ue-prototype');
const OUT = join(APP, 'assets', 'test', 'audio');

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

const masters = readdirSync(MASTERS);
mkdirSync(OUT, { recursive: true });
let failed = 0;
for (const [name, from, bitrate, channels] of FILES) {
  const master = masters.find((f) => f.startsWith(from) && f.toLowerCase().endsWith('.wav'));
  if (!master) {
    console.error(`MISSING  ${from}*.wav (for ${name})`);
    failed++;
    continue;
  }
  const out = join(OUT, `${name}.m4a`);
  // -movflags +faststart: the index first, so a streamed file starts playing before it's all here.
  const run = spawnSync('ffmpeg', ['-y', '-v', 'error', '-i', join(MASTERS, master), '-vn', '-ac', String(channels), '-c:a', 'aac', '-b:a', bitrate, '-movflags', '+faststart', out], { stdio: ['ignore', 'inherit', 'inherit'] });
  if (run.status !== 0) {
    console.error(`FAILED   ${name}`);
    failed++;
    continue;
  }
  console.log(`${name}.m4a  ${(statSync(out).size / 1024).toFixed(0)} kB  ← ${master}`);
}
process.exit(failed === 0 ? 0 : 1);
