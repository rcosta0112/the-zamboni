// Export the ship or the crew from the reference file into the game's assets, in one go (in app/):
//
//     npm run export:ship       ship + collider → assets/test/zamboni-ship.glb, zamboni-ship-col.glb
//     npm run export:crew       crew → assets/test/zamboni-crew.glb
//     npm run export:player     the player's Dr. Green → assets/test/green-parka.glb (not compressed)
//     npm run export:accept -- ship   take the files of a stopped export (refused if the .blend was saved since)
//     npm run rest-poses        the moving parts' rest poses, checked or taken (rest_poses.py); no export
//
// Runs the Blender export script (nothing is saved to the .blend: Blender may be open), caps the
// textures at 512 px, removes duplicates (ship), compresses (Meshopt) into .export/<what>/out/,
// then compares with the game's files and the last taken export's lines. **The gate:** the game's
// files are replaced only when nothing differs (objects, animations, bytes, a new PERF / NODES /
// NOTE / POSE line, any STOP line), but for the exceptions in EXCEPTIONS (flagged, "FLAG:"); then
// the after-export check runs (after-export.js, if the dev server is up). Otherwise the summary lists
// every reason and the files wait for `npm run export:accept`. The raw files, the baked images and
// Blender's full log stay in app/prototypes/0.0.2/.export/<what>/ (not in git).
// Blender: BLENDER_PATH, or its usual place on Windows, or `blender` on the PATH.

import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PROTO = resolve(dirname(fileURLToPath(import.meta.url)), '..'); // this version's folder
const APP = resolve(PROTO, '..', '..');
const ROOT = resolve(APP, '..');
// The current version exports from the owner's working file.
// EXPORT_BLEND: another file, for trying the export out on a scratch copy.
const BLEND = process.env.EXPORT_BLEND ?? join(ROOT, 'resources', 'models', 'The Zamboni 1.21.blend');
const BLEND_NAME = BLEND.startsWith(ROOT) ? BLEND.slice(ROOT.length + 1) : BLEND;
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
// No __pycache__ next to the export scripts.
const run = (command, args) => spawnSync(command, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28, env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' } });

// `npm run rest-poses [-- --accept <name>]`: the moving parts' rest poses (rest_poses.py), checked
// against the file or taken from it; no export.
if (what === 'rest-poses') {
  const done = run(BLENDER, ['-b', BLEND, '--python', join(PROTO, 'tools', 'rest_poses.py'), '--', ...process.argv.slice(3)]);
  const out = `${done.stdout ?? ''}\n${done.stderr ?? ''}`.split(/\r?\n/).filter((l) => /^(POSE|REST POSES)\b/.test(l));
  console.log(out.join('\n') || `rest-poses: Blender printed nothing${done.error ? ` (${done.error.message})` : ''}`);
  process.exit(done.status ?? 1);
}
const size = (file) => `${(statSync(file).size / 1e6).toFixed(2)} MB`;
const paths = (w) => ({
  raw: join(PROTO, '.export', w),
  // The new game files, until they're taken.
  waiting: join(PROTO, '.export', w, 'out'),
  pending: join(PROTO, '.export', w, 'waiting.json'),
  // The lines of the last export that was taken: what a new export is compared with.
  lines: join(PROTO, '.export', `${w}-lines.txt`),
});

/** The waiting files into the game, and their lines as the new baseline. */
function take(w, files, lines) {
  const p = paths(w);
  for (const name of files) copyFileSync(join(p.waiting, name), join(ASSETS, name));
  writeFileSync(p.lines, lines);
  if (w === 'ship') writeIds(lines);
  rmSync(p.pending, { force: true });
}

/** `ID: <id> = <kind>, '<name>' in '<collection>'` → [id, { kind, name, collection }]. */
const idOf = (line) => {
  const m = /^ID: (\S+) = (\S+), '(.*)' in '(.*)'$/.exec(line);
  return m ? [m[1], { kind: m[2], name: m[3], collection: m[4] }] : null;
};

/** ids.json (the game's structure, *Ids*): every id the taken ship export carries, its kind and where it is in the file. */
function writeIds(lines) {
  const ids = { _note: "Written by the ship export when it's taken (export.mjs): each id, its kind, its object's name and collection in the file. Don't edit: set ids in the .blend." };
  for (const line of lines.split('\n')) {
    const entry = idOf(line);
    if (entry) ids[entry[0]] = entry[1];
  }
  writeFileSync(join(PROTO, 'tools', 'ids.json'), `${JSON.stringify(ids, null, 1)}\n`);
}

/** The after-export check (after-export.js), when the dev server is up. */
async function afterCheck() {
  const up = await fetch('http://localhost:5202/', { signal: AbortSignal.timeout(2000) }).then((r) => r.ok, () => false);
  const command = 'npm run probe -- tools/after-export.js';
  if (!up) {
    console.log(`The dev server isn't running: start it (npm run dev) and check the game: ${command}`);
    return;
  }
  console.log('The after-export check (about 30 s):');
  const done = run(process.execPath, [join(PROTO, 'tools', 'probe-01.mjs'), join(PROTO, 'tools', 'after-export.js')]);
  const out = (done.stdout ?? '').split(/\r?\n/).filter((l) => /^\s*"(PASS|FAIL)/.test(l)).map((l) => `  ${l.trim().replace(/^"|",?$/g, '')}`);
  console.log(out.join('\n') || `  it printed nothing usable: run ${command}\n${done.stdout}\n${done.stderr}`);
}

// `npm run export:accept -- <ship|crew|player>`: the files of a stopped export, as its summary showed them.
if (what === 'accept') {
  const w = process.argv[3];
  const p = paths(w ?? '');
  if (!w || !existsSync(p.pending)) {
    console.error(`export:accept: no stopped export waiting${w ? ` for the ${w}` : ''} (npm run export:accept -- ship | crew | player)`);
    process.exit(2);
  }
  const pending = JSON.parse(readFileSync(p.pending, 'utf8'));
  if (statSync(BLEND).mtimeMs !== pending.blendSaved) {
    console.error(`export:accept: ${BLEND_NAME} was saved after that export: what's waiting may not be what's in the file. Export again (npm run export:${w}).`);
    process.exit(1);
  }
  take(w, pending.files, pending.lines);
  console.log(`Taken: ${pending.files.join(', ')} into the game (${ASSETS.slice(PROTO.length + 1)}).`);
  await afterCheck();
  process.exit(0);
}
if (!job) {
  console.error('export: npm run export:ship | npm run export:crew | npm run export:player | npm run export:accept -- <what> | npm run rest-poses');
  process.exit(2);
}

const { raw, waiting, pending: pendingFile, lines: linesFile } = paths(what);
const lastLines = existsSync(linesFile) ? readFileSync(linesFile, 'utf8') : '';
const blendSaved = statSync(BLEND).mtimeMs;
rmSync(raw, { recursive: true, force: true });
mkdirSync(waiting, { recursive: true });

// 1. Blender.
const started = Date.now();
const blender = run(BLENDER, ['-b', BLEND, '--python', join(PROTO, 'tools', job.script), '--', ...job.args(raw)]);
const log = `${blender.stdout ?? ''}\n${blender.stderr ?? ''}`;
writeFileSync(join(raw, 'export.log'), log);
if (blender.error || !/^EXPORTED /m.test(log)) {
  console.error(`export: Blender didn't finish the export${blender.error ? ` (${blender.error.message})` : ''}. Its log: ${join(raw, 'export.log')}`);
  console.error(log.split(/\r?\n/).filter((l) => /^(SCALE|STOP):|Error|Traceback|^\s+File "/.test(l) && !/addons|_ARRAY_API|unregister/.test(l)).slice(-8).join('\n'));
  process.exit(1);
}
const lines = log.split(/\r?\n/).filter((l) => /^(PERF|NODES|NOTE|POSE|STOP|CREW|BAKED|SHAPE KEY|SCALE|ID)\b/.test(l));
const counts = log.split(/\r?\n/).find((l) => l.startsWith('objects:'));

// 2. Resize, dedup, compress, into the waiting folder.
for (const [name, steps] of Object.entries(job.files)) {
  let from = join(raw, name);
  for (const step of steps) {
    if (step === 'copy') {
      copyFileSync(from, join(waiting, name));
      continue;
    }
    const to = step === 'meshopt' ? join(waiting, name) : join(raw, name.replace('.glb', `-${step}.glb`));
    const done = run(process.execPath, [GLTF_TRANSFORM, step, from, to, ...(step === 'resize' ? ['--width', '512', '--height', '512'] : [])]);
    if (done.status !== 0) {
      console.error(`export: gltf-transform ${step} failed on ${name}\n${done.stdout}\n${done.stderr}`);
      process.exit(1);
    }
    from = to;
  }
}

// 3. The gate (owner, 2026-10-20: "anything that looks odd and could potentially give an
// unexpected result should stop the export. Let's start broad and add exceptions as we go"). The
// game's files are replaced only when nothing differs from the last taken export; otherwise the new
// files wait in .export/<what>/out/ and `npm run export:accept -- <what>` takes them.
// Lines that stop the export when they're new (not in the last taken export's lines):
const GATED = /^(PERF|NODES|NOTE|POSE|STOP)\b/;
// The exceptions, one at a time, each with a line in doc/architecture/asset-pipeline.md (*The gate*).
const EXCEPTIONS = {
  // The frame the file was left on: every export runs at the start frame (owner, 2026-10-20).
  line: [/^POSE: the file is on frame -?\d+/],
  // The crew's places, poses and actions only flag (owner, 2026-10-20: they change from scene to scene).
  diff: what === 'crew' ? [/: bounds moved by /, /^DIFF {2}animation /] : [],
};
console.log(`exported the ${what} from ${BLEND_NAME} in ${Math.round((Date.now() - started) / 1000)} s`);
if (counts) console.log(counts.replace(/, convex hulls:.*/, ''));
const text = lines.join('\n');
const before = new Set(lastLines.split('\n'));
const reasons = [];
const flags = [];
for (const line of lines) {
  if (line.startsWith('STOP')) reasons.push(line);
  else if (GATED.test(line) && !before.has(line)) (EXCEPTIONS.line.some((r) => r.test(line)) ? flags : reasons).push(`new: ${line}`);
}
// The crew: where each one is, against the last taken export (a lost action stops it).
const crewOf = (all) => new Map(all.filter((l) => l.startsWith('CREW: ')).map((l) => [l.slice(6, l.indexOf(' at (')), l]));
const crewBefore = crewOf([...before]);
const crewNow = crewOf(lines);
for (const [name, line] of crewNow) {
  const was = crewBefore.get(name);
  if (!was) {
    if (crewBefore.size) flags.push(`new in the crew: ${line}`);
  } else if (was !== line) {
    if (!/action none$/.test(was) && /action none$/.test(line)) reasons.push(`STOP: ${name} had an animation in the last taken export and has none now (${line})`);
    else flags.push(`${line} (was: ${was.slice(6)})`);
  }
}
for (const name of crewBefore.keys()) if (!crewNow.has(name)) reasons.push(`STOP: ${name} was in the last taken export and isn't now`);
// The ids: one gone, or on another kind, stops it (scenes, Ink and cutscenes name them); a new one,
// or one whose object was renamed or moved to another collection, is only flagged.
const idsOf = (all) => new Map(all.map(idOf).filter(Boolean));
const idsBefore = idsOf([...before]);
const idsNow = idsOf(lines);
for (const [id, was] of idsBefore) {
  const now = idsNow.get(id);
  if (!now) reasons.push(`STOP: the id ${id} ('${was.name}') was in the last taken export and isn't now`);
  else if (now.kind !== was.kind) reasons.push(`STOP: the id ${id} was a ${was.kind} and is now a ${now.kind}`);
  else if (now.name !== was.name || now.collection !== was.collection) flags.push(`the id ${id}: '${was.name}' in '${was.collection}' is now '${now.name}' in '${now.collection}'`);
}
const newIds = [...idsNow.keys()].filter((id) => !idsBefore.has(id));
if (newIds.length) flags.push(`${newIds.length} new id(s): ${newIds.slice(0, 8).join(', ')}${newIds.length > 8 ? ' …' : ''}`);
const changedFiles = [];
const report = [];
for (const name of Object.keys(job.files)) {
  const now = join(waiting, name);
  const game = join(ASSETS, name);
  if (!existsSync(game)) {
    reasons.push(`${name}: new (${size(now)})`);
    changedFiles.push(name);
    continue;
  }
  if (readFileSync(game).equals(readFileSync(now))) {
    report.push(`${name}: identical to the game's (${size(now)})`);
    continue;
  }
  changedFiles.push(name);
  const compared = run(process.execPath, [join(PROTO, 'tools', 'compare-glb.mjs'), game, now]);
  const differences = compared.stdout.split(/\r?\n/).filter((l) => l.startsWith('DIFF'));
  const flagged = differences.filter((d) => EXCEPTIONS.diff.some((r) => r.test(d)));
  const stopping = differences.filter((d) => !flagged.includes(d));
  report.push(`${name}: ${size(game)} → ${size(now)}; ${differences.length ? `${differences.length} difference(s)${flagged.length ? `, ${flagged.length} of them only flagged` : ''}` : 'same objects, triangles, bounds, tags and animations'}`);
  for (const d of stopping.slice(0, 25)) reasons.push(`${name}: ${d}`);
  if (stopping.length > 25) reasons.push(`${name}: … ${stopping.length - 25} more: node tools/compare-glb.mjs "${game}" "${now}"`);
  // A character moved moves all its bones: one line for what moved, the CREW: lines say who and where.
  const moved = flagged.filter((d) => / bounds moved by /.test(d));
  const most = Math.max(0, ...moved.map((d) => Number(/moved by up to ([\d.]+)/.exec(d)?.[1] ?? 0)));
  if (moved.length) flags.push(`${name}: ${moved.length} object(s) moved, up to ${most.toFixed(3)} m: ${moved.slice(0, 6).map((d) => d.slice(6, d.indexOf(': bounds'))).join(', ')}${moved.length > 6 ? ' …' : ''}`);
  for (const d of flagged.filter((d) => !moved.includes(d))) flags.push(`${name}: ${d}`);
  if (!differences.length) reasons.push(`${name}: its bytes differ (materials, textures or the order of the data)`);
}
for (const line of report) console.log(line);
for (const line of flags) console.log(`FLAG: ${line}`);
if (!reasons.length) {
  take(what, changedFiles, text);
  if (!changedFiles.length) {
    console.log('Nothing changed in the game files.');
  } else {
    console.log(`Taken: ${changedFiles.join(', ')} (only flagged differences).`);
    await afterCheck();
  }
} else {
  writeFileSync(pendingFile, JSON.stringify({ blendSaved, files: changedFiles, lines: text }, null, 1));
  console.log(`STOPPED: the game's files are left alone, for ${reasons.length} reason(s):`);
  for (const line of reasons) console.log(`  ${line}`);
  console.log(`The new files wait in ${waiting.slice(PROTO.length + 1)}. If that's what you meant: npm run export:accept -- ${what}`);
}
