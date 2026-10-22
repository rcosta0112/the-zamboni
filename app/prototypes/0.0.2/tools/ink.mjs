// Compiles the stories to what the game loads, with inkjs's compiler: the game's
// (public/story/story.ink → story.json) and the checks' (public/test/story.ink → story.json). In
// app/: `npm run ink`. Prints the compiler's errors and warnings; exits 1 on an error (that story's
// old story.json is left as it was).
// Plans: doc/plans/architecture/game-architecture/game-structure.md (pass 3),
// doc/plans/features/flying-scene.md (pass 1: the game's story)

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Compiler } from 'inkjs/full';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let failed = false;
for (const folder of ['public/story', 'public/test']) {
  const messages = [];
  const compiler = new Compiler(readFileSync(join(root, folder, 'story.ink'), 'utf8'), { errorHandler: (message) => messages.push(message) });
  let story = null;
  try {
    story = compiler.Compile();
  } catch (err) {
    messages.push(`ERROR: ${err instanceof Error ? err.message : err}`);
  }
  for (const m of messages) console.log(`${folder}/story.ink: ${m}`);
  if (!story || messages.some((m) => /error/i.test(m))) {
    console.log(`${folder}/story.ink: not compiled`);
    failed = true;
    continue;
  }
  writeFileSync(join(root, folder, 'story.json'), story.ToJson());
  console.log(`${folder}/story.ink → story.json (${messages.length} warning${messages.length === 1 ? '' : 's'})`);
}
process.exit(failed ? 1 : 0);
