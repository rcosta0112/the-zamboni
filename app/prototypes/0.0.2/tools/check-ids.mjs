// The ids named in the game's data, checked (the game's structure, pass 6c): every id a scene's setup,
// a cutscene track's events and end state, or an Ink story names must exist, and be of a kind the
// command can act on. Both stories (the game's, public/story/; the checks', public/test/) and both
// scene folders (public/scenes/, public/test/scenes/). Part of `npm run check`; prints each problem and exits 1 if there's one.
//
//     node tools/check-ids.mjs        (in app/prototypes/0.0.2/)
//
// Things: tools/ids.json (written by the ship export) and the crew's ids (CREW_IDS in
// export-ship-crew.py). Also checked: cutscenes by their track file, sound cues in src/cues.json,
// story knots and the variables of `if` / `unless` in the Ink source, the knots `use_<id>` and
// `talk_<id>` (a character's), and each line's speaker (the name before a colon: SPEAKERS in story.ts).
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
// What `set` acts on: the door kinds (kinds.ts) and the ramp. `lock` and `unlock` act on anything
// she can use (the flying scene, pass 1): any thing.
const doorKinds = /DOOR_KINDS = \{([\s\S]*?)\} satisfies/.exec(read('src/kinds.ts'))?.[1] ?? '';
const openable = new Set(['ramp', ...[...doorKinds.matchAll(/^\s*'?([\w-]+)'?: door\(/gm)].map((m) => m[1])]);
const cues = new Set(Object.keys(json('src/cues.json')));
const tracks = new Set(fs.readdirSync(path.join(root, 'public/test/cutscenes')).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)));
const STORIES = ['public/story/story.ink', 'public/test/story.ink'];
const inks = STORIES.map((file) => read(file));
// The game's scenes and the tracks may run with either story: a knot or variable they name must be in
// both. The checks' scenes run with the test story only.
const named = (re, of = inks) => of.map((ink) => new Set([...ink.matchAll(re)].map((m) => m[1]))).reduce((a, b) => new Set([...a].filter((x) => b.has(x))));
const KNOT = /^\s*===\s*(?:function\s+)?(\w+)/gm;
const VAR = /^\s*(?:VAR|CONST)\s+(\w+)/gm;
let knots = named(KNOT);
let vars = named(VAR);

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
      return thing(where, c.id, openable, "doesn't open");
    case 'lock':
    case 'unlock':
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
    case 'outfit':
      checked++;
      if (c.set !== 'jumpsuit' && c.set !== 'parka') problems.push(`${where}: no outfit "${c.set}" (jumpsuit, parka)`);
      return;
    case 'seat':
      checked++;
      if (c.id !== 'green') problems.push(`${where}: only "green" can be seated so far, not "${c.id}"`);
      return;
    case 'swap-exterior':
      return;
    default:
      problems.push(`${where}: unknown command "${c.do}"`);
  }
}

for (const folder of ['public/scenes', 'public/test/scenes']) {
  if (folder === 'public/test/scenes') [knots, vars] = [named(KNOT, [inks[1]]), named(VAR, [inks[1]])];
  for (const file of fs.readdirSync(path.join(root, folder)).filter((f) => f.endsWith('.json'))) {
    const scene = json(`${folder}/${file}`);
    scene.setup.forEach((c, i) => command(`scene ${folder}/${file}, setup ${i + 1}`, c));
    (scene.begin ?? []).forEach((c, i) => command(`scene ${folder}/${file}, begin ${i + 1}`, c));
  }
}
[knots, vars] = [named(KNOT), named(VAR)];
for (const id of tracks) {
  const track = json(`public/test/cutscenes/${id}.json`);
  (track.events ?? []).forEach((e, i) => command(`cutscene ${id}, event ${i + 1}`, e.command));
  (track.end ?? []).forEach((c, i) => command(`cutscene ${id}, end ${i + 1}`, c));
}
const speakers = new Set([.../SPEAKERS: Record<string, string> = \{([^}]*)\}/.exec(read('src/story.ts'))?.[1].matchAll(/^\s*'?([\w ]+?)'?:/gm) ?? []].map((m) => m[1]));
STORIES.forEach((file, at) => {
  const ink = inks[at];
  const storyKnots = new Set([...ink.matchAll(/^\s*===\s*(?:function\s+)?(\w+)/gm)].map((m) => m[1]));
  // Ink: `command("<name>", "<id>", "<value>")`, as story.ts turns it into a command.
  for (const [line, n] of ink.split(/\r?\n/).map((l, i) => [l, i + 1])) {
    for (const [, name, id, value] of line.matchAll(/command\(\s*"([^"]*)"\s*,\s*"([^"]*)"\s*,\s*"([^"]*)"\s*\)/g)) {
      const where = `${file}:${n}`;
      if (name === 'set' && value !== 'open' && value !== 'closed') problems.push(`${where}: set "${id}" to "${value}" (open or closed)`);
      else if (name === 'set') command(where, { do: 'set', id, state: value });
      else if (name === 'sound') command(where, { do: 'sound', cue: value, at: id || undefined });
      else if (['lock', 'unlock', 'enable', 'disable', 'cutscene'].includes(name)) command(where, { do: name, id });
      else problems.push(`${where}: Ink can't call the command "${name}" (story.ts, fromInk)`);
    }
  }
  // A line's speaker: a capitalised name before a colon at the line's start (not a comment, tag,
  // knot or code line) must be one story.ts knows, or the box shows it as narration.
  for (const [line, n] of ink.split(/\r?\n/).map((l, i) => [l, i + 1])) {
    const name = /^\s*([A-Z][\w .]*?)\s*:/.exec(line)?.[1];
    if (!name || /^(VAR|CONST|INCLUDE|EXTERNAL)\b/.test(name)) continue;
    checked++;
    if (!speakers.has(name)) problems.push(`${file}:${n}: no speaker "${name}" (SPEAKERS in story.ts: ${[...speakers].join(', ')})`);
  }
  // Topics (Ink's choices): four at most fit above the box. A warning, not a problem: more is the script's call.
  // Counted per list: the top-level choices (`*`, `+`) between a knot or stitch and a gather (`-`).
  let list = { count: 0, at: 0 };
  for (const [line, n] of ink.split(/\r?\n/).map((l, i) => [l, i + 1])) {
    if (/^\s*(===|=\s*\w|-(?!>))/.test(line)) list = { count: 0, at: n };
    else if (/^\s*[*+](?![*+])/.test(line) && ++list.count === 5) console.warn(`${file}:${n}: more than four topics in one list (from line ${list.at}): the list may not fit above the box`);
  }
  for (const knot of storyKnots) if (knot.startsWith('use_')) thing(`${file}, knot ${knot}`, knot.slice(4).replace(/_/g, '-'));
  for (const knot of storyKnots) if (knot.startsWith('talk_')) thing(`${file}, knot ${knot}`, knot.slice(5).replace(/_/g, '-'), new Set(['character']), "isn't a character");
});

if (problems.length) {
  console.error(`ids: ${problems.length} problem(s)\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log(`ids: ${checked} named in the scenes, cutscenes and story, all found`);
