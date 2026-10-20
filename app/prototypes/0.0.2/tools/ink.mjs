// Compiles the test story (public/test/story.ink) to what the game loads (public/test/story.json),
// with inkjs's compiler. In app/: `npm run ink`. Prints the compiler's errors and warnings; exits 1
// on an error (the old story.json is left as it was).
// Plan: doc/plans/architecture/game-architecture/game-structure.md (pass 3)

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Compiler } from 'inkjs/full';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'public/test/story.ink');
const out = join(root, 'public/test/story.json');

const messages = [];
const compiler = new Compiler(readFileSync(source, 'utf8'), { errorHandler: (message) => messages.push(message) });
let story = null;
try {
  story = compiler.Compile();
} catch (err) {
  messages.push(`ERROR: ${err instanceof Error ? err.message : err}`);
}
for (const m of messages) console.log(m);
if (!story || messages.some((m) => /error/i.test(m))) {
  console.log('story.ink: not compiled');
  process.exit(1);
}
writeFileSync(out, story.ToJson());
console.log(`story.ink → public/test/story.json (${messages.length} warning${messages.length === 1 ? '' : 's'})`);
