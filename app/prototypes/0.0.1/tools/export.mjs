// Export the ship or the crew from the reference file into the game's assets, in one go (in app/):
//
//     npm run export:ship       ship + collider → assets/test/zamboni-ship.glb, zamboni-ship-col.glb
//     npm run export:crew       crew → assets/test/zamboni-crew.glb
//     npm run export:player     the player's Dr. Green → assets/test/green-parka.glb (not compressed)
//
// Runs the Blender export script (nothing is saved to the .blend: Blender may be open), caps the
// textures at 512 px, removes duplicates (ship), compresses (Meshopt), then compares with the
// files that were there and prints a short summary: what differs, the sizes, and the export's
// "PERF:" / "NODES:" / "NOTE:" lines when they differ from the last run's. The raw files, the baked
// images and Blender's full log stay in app/.export/<ship|crew>/ (not in git).
// Blender: BLENDER_PATH, or its usual place on Windows, or `blender` on the PATH.

import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PROTO = resolve(dirname(fileURLToPath(import.meta.url)), '..'); // this version's folder
const APP = resolve(PROTO, '..', '..');
const ROOT = resolve(APP, '..');
const BLEND = join(ROOT, 'resources', 'models', 'The Zamboni 1.21.blend');
const ASSETS = join(PROTO, 'public', 'test');
const GLTF_TRANSFORM = join(APP, 'node_modules', '@gltf-transform', 'cli', 'bin', 'cli.js');
const BLENDER = [process.env.BLENDER_PATH, 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe'].find((p) => p && existsSync(p)) ?? 'blender';

const what = process.argv[2];
const JOBS = {
  ship: {
    script: 'export-ship.py',
    args: (raw) => ['--out', join(raw, 'zamboni-ship.glb'), '--collider-out', join(raw, 'zamboni-ship-col.glb')],
    files: { 'zamboni-ship.glb': ['resize', 'dedup', 'meshopt'], 'zamboni-ship-col.glb': ['meshopt'] },
  },
  crew: {
    script: 'export-ship-crew.py',
    args: (raw) => ['--out', join(raw, 'zamboni-crew.glb')],
    files: { 'zamboni-crew.glb': ['resize', 'meshopt'] },
  },
  // The player's Dr. Green (the `Player` collection), at the file's scale (the game's since
  // 2026-10-19); not compressed (the game loads it without a Meshopt decoder).
  player: {
    script: 'export-crew-character.py',
    args: (raw) => [
      '--armature', 'Dr. Green Parka',
      '--objects', 'Dr. Green Mesh.004,Gadget.004,Gadget.005,Backpack.002,Jetpack',
      '--force-double-sided',
      // The ladder clip, made on her jump suit's armature standing at the ladder's foot.
      '--clip', 'Dr. Green - Ladder x1.25',
      '--clip-start', 'Dr. Green Jump suit',
      '--out', join(raw, 'green-parka.glb'),
    ],
    files: { 'green-parka.glb': ['copy'] },
  },
};
const job = JOBS[what];
if (!job) {
  console.error('export: npm run export:ship | npm run export:crew | npm run export:player');
  process.exit(2);
}

const size = (file) => `${(statSync(file).size / 1e6).toFixed(2)} MB`;
// No __pycache__ next to the export scripts.
const run = (command, args) => spawnSync(command, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28, env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' } });

const raw = join(PROTO, '.export', what);
const linesFile = join(PROTO, '.export', `${what}-lines.txt`);
const lastLines = existsSync(linesFile) ? readFileSync(linesFile, 'utf8') : '';
rmSync(raw, { recursive: true, force: true });
mkdirSync(join(raw, 'before'), { recursive: true });
for (const name of Object.keys(job.files)) if (existsSync(join(ASSETS, name))) copyFileSync(join(ASSETS, name), join(raw, 'before', name));

// 1. Blender.
const started = Date.now();
const blender = run(BLENDER, ['-b', BLEND, '--python', join(PROTO, 'tools', job.script), '--', ...job.args(raw)]);
const log = `${blender.stdout ?? ''}\n${blender.stderr ?? ''}`;
writeFileSync(join(raw, 'export.log'), log);
if (blender.error || !/^EXPORTED /m.test(log)) {
  console.error(`export: Blender didn't finish the export${blender.error ? ` (${blender.error.message})` : ''}. Its log: ${join(raw, 'export.log')}`);
  console.error(log.split(/\r?\n/).filter((l) => /^SCALE:|Error|Traceback|^\s+File "/.test(l) && !/addons|_ARRAY_API|unregister/.test(l)).slice(-8).join('\n'));
  process.exit(1);
}
const lines = log.split(/\r?\n/).filter((l) => /^(PERF|NODES|NOTE|BAKED|SHAPE KEY|SCALE)\b/.test(l));
const counts = log.split(/\r?\n/).find((l) => l.startsWith('objects:'));

// 2. Resize, dedup, compress.
for (const [name, steps] of Object.entries(job.files)) {
  let from = join(raw, name);
  for (const step of steps) {
    if (step === 'copy') {
      copyFileSync(from, join(ASSETS, name));
      continue;
    }
    const to = step === 'meshopt' ? join(ASSETS, name) : join(raw, name.replace('.glb', `-${step}.glb`));
    const done = run(process.execPath, [GLTF_TRANSFORM, step, from, to, ...(step === 'resize' ? ['--width', '512', '--height', '512'] : [])]);
    if (done.status !== 0) {
      console.error(`export: gltf-transform ${step} failed on ${name}\n${done.stdout}\n${done.stderr}`);
      process.exit(1);
    }
    from = to;
  }
}

// 3. The summary.
console.log(`exported the ${what} from ${BLEND.slice(ROOT.length + 1)} in ${Math.round((Date.now() - started) / 1000)} s`);
if (counts) console.log(counts.replace(/, convex hulls:.*/, ''));
const text = lines.join('\n');
if (text === lastLines) console.log(`${lines.length} PERF / NODES / NOTE lines, the same as the last export (${linesFile.slice(PROTO.length + 1)})`);
else console.log(text || 'no PERF / NODES / NOTE lines');
writeFileSync(linesFile, text);
let changed = false;
for (const name of Object.keys(job.files)) {
  const before = join(raw, 'before', name);
  const after = join(ASSETS, name);
  if (!existsSync(before)) {
    console.log(`${name}: new, ${size(after)}`);
    changed = true;
    continue;
  }
  if (readFileSync(before).equals(readFileSync(after))) {
    console.log(`${name}: identical to the file that was there (${size(after)})`);
    continue;
  }
  changed = true;
  const compared = run(process.execPath, [join(PROTO, 'tools', 'compare-glb.mjs'), before, after]);
  const differences = compared.stdout.split(/\r?\n/).filter((l) => l.startsWith('DIFF'));
  console.log(`${name}: ${size(before)} → ${size(after)}; ${differences.length ? `${differences.length} difference(s) in its objects:` : 'same objects, triangles, bounds and tags (the difference is in materials, textures or the order of the data)'}`);
  for (const line of differences.slice(0, 25)) console.log(`  ${line}`);
  if (differences.length > 25) console.log(`  … ${differences.length - 25} more: node tools/compare-glb.mjs "${before}" "${after}"`);
}
console.log(changed ? 'The game files changed: look at them in the game (npm run dev:01), then npm run smoke.' : 'Nothing changed in the game files.');
