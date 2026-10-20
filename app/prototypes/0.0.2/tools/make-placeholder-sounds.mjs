// Makes the placeholder sounds of the interactions and the footsteps (`node tools/make-placeholder-sounds.mjs`,
// in app/), with ffmpeg (on the PATH), into app/prototypes/0.0.2/public/test/audio/. Two kinds:
// - Made here from tones and noise (the latches, the panels' two tones, the ramp's motor and its
//   stop, the ladder): the recipe below is the source, there's no master. To change a sound,
//   change its numbers and run this again.
// - Her steps, cut out of recordings of someone walking: single steps are found by level, and four
//   of ordinary loudness are kept. In the snow: Part 1's running loop on grass (Big Moon Tiny Moon,
//   `Run Grass.mp3`). On the ship's floor: the owner's `freesound_community-metal-footsteps-14727.mp3`
//   in resources/audio/ (outside git). Before it, Part 1's `Run Rock.mp3` sounded like gravel, and
//   steps made here from tones were a stand-in (owner, 2026-10-13). Part 1's folder: BMTM_AUDIO, or the path below. `--steps` prints
//   every step found, to choose others by hand (STEPS).
// - The lever: the first of the two sounds in the owner's
//   `freesound_community-lever-action-cocking-2-39680.mp3` (resources/audio/), with the silence
//   around it cut off (TRIMMED).
// - The start button's click (`ui_click`), made from a tone and noise like the first kind.
// `--only <name>` makes one of the first kind and leaves the other files alone.
// Nothing here was listened to by the agent. Each file's source is in SOURCES.md beside the files.
// Plans: doc/plans/features/interaction-sounds.md, start-screen.md. Names: doc/architecture/audio.md.

import { spawnSync } from 'node:child_process';
import { mkdirSync, statSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PROTO = resolve(dirname(fileURLToPath(import.meta.url)), '..'); // this version's folder
const ROOT = resolve(PROTO, '..', '..', '..');
const OUT = join(PROTO, 'public', 'test', 'audio');
const PART1 = process.env.BMTM_AUDIO ?? 'C:/Users/31658/Projects/Big Moon Tiny Moon/Assets/Audio';
const MASTERS = resolve(ROOT, 'resources', 'audio');
const RATE = 44100;

// In the expressions: t = time (s); random(n) = noise, 0..1; a filter chain follows each.
const noise = (n) => `(random(${n})*2-1)`;
/** A burst that starts at `at` and dies away at `decay` per second. */
const hit = (at, decay) => (at === 0 ? `exp(-t*${decay})` : `gt(t,${at})*exp(-(t-${at})*${decay})`);
/** A soft-edged tone from `at`, `length` long. */
const tone = (hz, at, length) => `sin(2*PI*${hz}*t)*pow(sin(PI*clip((t-${at})/${length},0,1)),2)`;
/** A motor's time: it spins up over the first third of a second. */
const SPIN = '(t+exp(-6*t)/6)';

const MADE = [
  // A locker or cupboard latch: a small click, a softer one after it.
  ['sfx_latch_open', 0.2, `${noise(0)}*${hit(0, 150)}*0.5+sin(2*PI*320*t)*${hit(0, 60)}*0.35+${noise(1)}*${hit(0.05, 200)}*0.3`, 'highpass=f=150,lowpass=f=2500'],
  // The door coming to: a dull knock.
  ['sfx_latch_close', 0.25, `sin(2*PI*140*t)*${hit(0, 35)}*0.8+${noise(0)}*${hit(0, 90)}*0.3`, 'lowpass=f=1200'],
  // The panels' two tones: up for open, down for close.
  ['sfx_panel_open', 0.22, `(${tone(660, 0, 0.09)}+${tone(880, 0.1, 0.11)})*0.5`, 'lowpass=f=3000'],
  ['sfx_panel_close', 0.22, `(${tone(880, 0, 0.09)}+${tone(660, 0.1, 0.11)})*0.5`, 'lowpass=f=3000'],
  // The ramp and the side door moving: an electric motor (a hum with its harmonics and a faint
  // whine) over the hiss of hydraulics. Longer than any movement: the game fades it out at the end.
  ['sfx_ramp_move', 8, `sin(2*PI*110*${SPIN})*0.3+sin(2*PI*220*${SPIN})*0.14+sin(2*PI*330*${SPIN})*0.08+sin(2*PI*880*${SPIN}+1.5*sin(2*PI*27*t))*0.04+${noise(0)}*0.07`, 'lowpass=f=2200'],
  // It stops: the hydraulic press lets its pressure go (a hiss dying away) and the weight settles.
  ['sfx_ramp_stop', 0.7, `${noise(0)}*${hit(0, 8)}*0.3+sin(2*PI*70*t)*${hit(0, 22)}*0.7`, 'highpass=f=40,lowpass=f=3500'],
  // A hand on a rung: a light tap on metal, which rings for a moment.
  ...[[520, 1370], [560, 1290], [495, 1450]].map(([a, b], i) => [`sfx_ladder_grab_0${i + 1}`, 0.2, `${noise(0)}*${hit(0, 220)}*0.4+sin(2*PI*${a}*t)*${hit(0, 45)}*0.3+sin(2*PI*${b}*t)*${hit(0, 70)}*0.15`, 'highpass=f=200,lowpass=f=2600']),
  // A jetpack off the rack and onto her back: a scrape of straps, then the buckle's metal clack.
  ['sfx_jetpack_take', 0.45, `${noise(0)}*pow(sin(PI*clip(t/0.22,0,1)),2)*0.25+${noise(1)}*${hit(0.26, 160)}*0.45+sin(2*PI*1250*t)*${hit(0.26, 50)}*0.25+sin(2*PI*180*t)*${hit(0.26, 40)}*0.35`, 'highpass=f=120,lowpass=f=3800'],
  // Back on the rack: the buckle undone, a short scrape, the weight onto its hooks.
  ['sfx_jetpack_return', 0.45, `${noise(0)}*${hit(0, 170)}*0.4+sin(2*PI*1150*t)*${hit(0, 55)}*0.2+${noise(1)}*pow(sin(PI*clip((t-0.06)/0.16,0,1)),2)*0.2+sin(2*PI*130*t)*${hit(0.25, 35)}*0.6+${noise(2)}*${hit(0.25, 120)}*0.3`, 'highpass=f=80,lowpass=f=3200'],
  // The start button: a short, soft tick with a little body under it.
  ['ui_click', 0.12, `${noise(0)}*${hit(0, 320)}*0.3+sin(2*PI*1100*t)*${hit(0, 110)}*0.35+sin(2*PI*550*t)*${hit(0, 70)}*0.25`, 'highpass=f=250,lowpass=f=4500'],
];
const onlyAt = process.argv.indexOf('--only');
const ONLY = onlyAt >= 0 ? process.argv[onlyAt + 1] : null;

// [game file, the recording, what "loud" is measured against in it: the share of its 5 ms pieces
// that are quieter (1 = its loudest moment; lower for a recording with a few stray bangs far
// louder than its steps)]. Four steps each, chosen by findSteps; or name them here by number
// (as `--steps` lists them): STEPS['sfx_step_snow'] = [3, 7, 12, 20].
const CUT = [
  ['sfx_step_snow', join(PART1, 'Run Grass.mp3'), 1],
  ['sfx_step_ship', join(MASTERS, 'freesound_community-metal-footsteps-14727.mp3'), 1],
];
const STEPS = {};

// [game file, the recording, from, to (s)]: one sound out of a recording, without the silence
// around it. The lever's file is 1.44 s with two sounds (0.36 to 0.56 s and 0.76 to 0.93 s, by
// where it's quieter than -45 dB): the first.
const TRIMMED = [['sfx_lever', join(MASTERS, 'freesound_community-lever-action-cocking-2-39680.mp3'), 0.355, 0.565]];
const VARIATIONS = 4;

const ffmpeg = (args, options = {}) => spawnSync('ffmpeg', ['-y', '-v', 'error', ...args], { stdio: ['ignore', 'inherit', 'inherit'], ...options });
const encode = ['-ac', '1', '-ar', String(RATE), '-c:a', 'aac', '-b:a', '64k', '-movflags', '+faststart'];
const report = (name, from) => console.log(`${name}.m4a  ${(statSync(join(OUT, `${name}.m4a`)).size / 1024).toFixed(1)} kB  ← ${from}`);

/**
 * The single steps in a recording of someone running: stretches louder than the quiet between them.
 * Each: where it starts and ends (s) and its peak (0..1).
 */
function findSteps(file, loud) {
  const run = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-ac', '1', '-ar', '48000', '-f', 'f32le', '-'], { maxBuffer: 1 << 28 });
  if (run.status !== 0) throw new Error(`can't read ${file}`);
  const samples = new Float32Array(run.stdout.buffer, run.stdout.byteOffset, Math.floor(run.stdout.byteLength / 4));
  const HOP = 240; // 5 ms
  const level = [];
  for (let i = 0; i + HOP <= samples.length; i += HOP) {
    let sum = 0;
    for (let j = i; j < i + HOP; j++) sum += samples[j] * samples[j];
    level.push(Math.sqrt(sum / HOP));
  }
  const top = [...level].sort((x, y) => x - y)[Math.min(level.length - 1, Math.floor(level.length * loud))];
  const on = top * 0.08;
  const off = top * 0.02;
  const steps = [];
  let start = -1;
  let quiet = 0;
  for (let i = 0; i < level.length; i++) {
    if (start < 0) {
      if (level[i] > on) start = i;
      continue;
    }
    quiet = level[i] < off ? quiet + 1 : 0;
    // Over after 40 ms of quiet.
    if (quiet >= 8 || i === level.length - 1) {
      const end = i - quiet + 1;
      let peak = 0;
      for (let j = start * HOP; j < end * HOP; j++) peak = Math.max(peak, Math.abs(samples[j]));
      steps.push({ start: (start * HOP) / 48000, end: (end * HOP) / 48000, peak });
      start = -1;
      quiet = 0;
    }
  }
  return steps;
}

mkdirSync(OUT, { recursive: true });
let failed = 0;
for (const [name, seconds, expression, filters] of MADE) {
  if (ONLY && name !== ONLY) continue;
  // A short fade at both ends: no click where the sound starts or is cut off.
  const fade = `afade=t=in:d=0.003,afade=t=out:st=${(seconds - 0.03).toFixed(3)}:d=0.03`;
  const run = ffmpeg(['-f', 'lavfi', '-i', `aevalsrc=exprs='${expression}':d=${seconds}:s=${RATE}`, '-af', `${filters},${fade}`, ...encode, join(OUT, `${name}.m4a`)]);
  if (run.status !== 0) {
    console.error(`FAILED   ${name}`);
    failed++;
  } else report(name, 'made here');
}
for (const [name, file, from, to] of ONLY ? [] : TRIMMED) {
  const length = to - from;
  const filters = `afade=t=in:d=0.003,afade=t=out:st=${(length - 0.02).toFixed(3)}:d=0.02`;
  const run = ffmpeg(['-ss', String(from), '-t', length.toFixed(3), '-i', file, '-vn', '-af', filters, ...encode, join(OUT, `${name}.m4a`)]);
  if (run.status !== 0) {
    console.error(`FAILED   ${name}`);
    failed++;
  } else report(name, `${basename(file)}, ${from} to ${to} s`);
}
for (const [name, file, loud] of ONLY ? [] : CUT) {
  const from = basename(file);
  let steps;
  try {
    steps = findSteps(file, loud).map((s, i) => ({ ...s, n: i + 1 }));
  } catch (err) {
    console.error(`MISSING  ${file} (for ${name}): ${err.message}`);
    failed++;
    continue;
  }
  // One footfall, not two run together, a scrape or a crackle: 0.04 to 0.4 s long.
  const single = steps.filter((s) => s.end - s.start >= 0.04 && s.end - s.start <= 0.4);
  if (process.argv.includes('--steps')) for (const s of steps) console.log(`  ${name} step ${s.n}: ${s.start.toFixed(2)} s, ${((s.end - s.start) * 1000).toFixed(0)} ms, peak ${s.peak.toFixed(2)}${single.includes(s) ? '' : '  (not a single step)'}`);
  // The four nearest the middle loudness, spread through the recording.
  const byPeak = [...single].sort((a, b) => a.peak - b.peak);
  const middle = byPeak.slice(Math.floor(byPeak.length * 0.3), Math.ceil(byPeak.length * 0.7)).sort((a, b) => a.start - b.start);
  const chosen = STEPS[name]?.map((n) => steps[n - 1]) ?? Array.from({ length: VARIATIONS }, (_, i) => middle[Math.floor(((i + 0.5) * middle.length) / VARIATIONS)]);
  if (chosen.some((s) => !s)) {
    console.error(`FAILED   ${name}: ${single.length} single steps found in ${from}, ${VARIATIONS} needed`);
    failed++;
    continue;
  }
  for (const [i, step] of chosen.entries()) {
    const out = `${name}_0${i + 1}`;
    const start = Math.max(0, step.start - 0.008);
    const length = step.end - start + 0.06; // its tail, below the level that ended it
    // Each step brought to the same peak (-6 dB): the mix is set in the game.
    const filters = `volume=${(0.5 / step.peak).toFixed(3)},afade=t=in:d=0.004,afade=t=out:st=${(length - 0.03).toFixed(3)}:d=0.03`;
    const run = ffmpeg(['-ss', start.toFixed(3), '-t', length.toFixed(3), '-i', file, '-vn', '-af', filters, ...encode, join(OUT, `${out}.m4a`)]);
    if (run.status !== 0) {
      console.error(`FAILED   ${out}`);
      failed++;
    } else report(out, `${from}, step ${step.n} of ${steps.length} (${step.start.toFixed(2)} s, ${(length * 1000).toFixed(0)} ms)`);
  }
}
process.exit(failed === 0 ? 0 : 1);
