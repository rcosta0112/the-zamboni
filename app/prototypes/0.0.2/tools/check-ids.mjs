// The ids named in the game's data, checked (the game's structure, pass 6c): every id a scene's setup,
// a cutscene track's events and end state, or the Ink story names must exist, and be of a kind the
// command can act on. Part of `npm run check`; prints each problem and exits 1 if there's one.
//
//     node tools/check-ids.mjs        (in app/prototypes/0.0.2/)
//
// Things: tools/ids.json (written by the ship export) and the crew's ids (CREW_IDS in
// export-ship-crew.py). Also checked: cutscenes by their track file, sound cues in src/cues.json,
// story knots and the variables of `if` / `unless` in the Ink source, the knots `use_<id>` and
// `talk_<id>` (a character's).
// Plan: doc/plans/architecture/game-architecture/game-structure.md (pass 6)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const json = (file) => JSON.parse(read(file));

const things = new Map(Object.entries(json('tools/ids.json')).filter(([id]) => !id.startsWith('_')).map(([id, v]) => [id, v.kind]));
const crew = /CREW_IDS = \{([^}]*)\}/.exec(read('tools/export-ship-crew.py'))?.[1] ?? '';
for (const [, id] of crew.matchAll(/:\s*'([^']+)'/g)) things.set(id, 'character');
// What `set`, `lock` and `unlock` act on: the door kinds (kinds.ts) and the ramp.
const doorKinds = /DOOR_KINDS = \{([\s\S]*?)\}/.exec(read('src/kinds.ts'))?.[1] ?? '';
const openable = new Set(['ramp', ...[...doorKinds.matchAll(/^\s*'?([\w-]+)'?: door\(/gm)].map((m) => m[1])]);
const cues = new Set(Object.keys(json('src/cues.json')));
const tracks = new Set(fs.readdirSync(path.join(root, 'public/test/cutscenes')).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)));
const ink = read('public/test/story.ink');
const knots = new Set([...ink.matchAll(/^\s*===\s*(?:function\s+)?(\w+)/gm)].map((m) => m[1]));
const vars = new Set([...ink.matchAll(/^\s*(?:VAR|CONST)\s+(\w+)/gm)].map((m) => m[1]));

const problems = [];
let checked = 0;

function thing(where, id, kinds, what) {
  checked++;
  const kind = things.get(id);
  if (kind === undefined) problems.push(`${where}: no thing "${id}" (not in tools/ids.json nor the crew)`);
  else if (kinds && !kinds.has(kind)) problems.push(`${where}: "${id}" is a ${kind}, which ${what}`);
}

/** One command of commands.ts, from a scene, a track or Ink. */
function command(where, c) {
  for (const key of ['if', 'unless']) if (c[key] !== undefined && !vars.has(c[key])) problems.push(`${where}: no story variable "${c[key]}"`);
  switch (c.do) {
    case 'set':
    case 'lock':
    case 'unlock':
      return thing(where, c.id, openable, "doesn't open");
    case 'enable':
    case 'disable':
      return thing(where, c.id);
    case 'place':
      return thing(where, c.id, new Set(['character']), "isn't a character");
    case 'sound':
      if (!cues.has(c.cue)) problems.push(`${where}: no sound cue "${c.cue}"`);
      if (c.at) thing(where, c.at);
      return;
    case 'story':
      checked++;
      if (!knots.has(c.knot)) problems.push(`${where}: no story knot "${c.knot}"`);
      return;
    case 'cutscene':
      checked++;
      if (!tracks.has(c.id)) problems.push(`${where}: no cutscene "${c.id}" (public/test/cutscenes/)`);
      return;
    case 'swap-exterior':
      return;
    default:
      problems.push(`${where}: unknown command "${c.do}"`);
  }
}

for (const file of fs.readdirSync(path.join(root, 'public/test/scenes')).filter((f) => f.endsWith('.json'))) {
  const scene = json(`public/test/scenes/${file}`);
  scene.setup.forEach((c, i) => command(`scene ${file}, setup ${i + 1}`, c));
}
for (const id of tracks) {
  const track = json(`public/test/cutscenes/${id}.json`);
  (track.events ?? []).forEach((e, i) => command(`cutscene ${id}, event ${i + 1}`, e.command));
  (track.end ?? []).forEach((c, i) => command(`cutscene ${id}, end ${i + 1}`, c));
}
// Ink: `command("<name>", "<id>", "<value>")`, as story.ts turns it into a command.
for (const [line, n] of ink.split(/\r?\n/).map((l, i) => [l, i + 1])) {
  for (const [, name, id, value] of line.matchAll(/command\(\s*"([^"]*)"\s*,\s*"([^"]*)"\s*,\s*"([^"]*)"\s*\)/g)) {
    const where = `story.ink:${n}`;
    if (name === 'set' && value !== 'open' && value !== 'closed') problems.push(`${where}: set "${id}" to "${value}" (open or closed)`);
    else if (name === 'set') command(where, { do: 'set', id, state: value });
    else if (name === 'sound') command(where, { do: 'sound', cue: value, at: id || undefined });
    else if (['lock', 'unlock', 'enable', 'disable', 'cutscene'].includes(name)) command(where, { do: name, id });
    else problems.push(`${where}: Ink can't call the command "${name}" (story.ts, fromInk)`);
  }
}
for (const knot of knots) if (knot.startsWith('use_')) thing(`story.ink, knot ${knot}`, knot.slice(4).replace(/_/g, '-'));
for (const knot of knots) if (knot.startsWith('talk_')) thing(`story.ink, knot ${knot}`, knot.slice(5).replace(/_/g, '-'), new Set(['character']), "isn't a character");

if (problems.length) {
  console.error(`ids: ${problems.length} problem(s)\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log(`ids: ${checked} named in the scenes, cutscenes and story, all found`);
