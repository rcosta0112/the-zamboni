# The Zamboni

A short third-person story/exploration game (visual novel × immersive sim) for the web, by Studio Cataplasma. Part 2 of a story begun in *Big Moon Tiny Moon*.

## Where things are

- `doc/`: the documentation, the project's **source of truth**. Start at `doc/README.md`. Decisions: `doc/decision-log.md`. Current work: `doc/steps/`. Plans: `doc/plans/`.
- `app/`: the code (npm workspace). See `app/README.md`.
- `resources/`: source art (Blender, textures, audio masters). **Not in git**; never add it.

## Picking the work up

1. **Read `doc/steps/current.md` first.** It says what's in progress, what's next, what's waiting on the owner and which files are involved. **Rewrite it at the end of every session** (60 lines at most; not a log).
2. Open other docs and source files only when the task needs them. For code, start from the **code map** of the current version, `app/prototypes/0.0.2/CODE-MAP.md`; for export and check scripts, from `app/prototypes/0.0.2/tools/README.md`; for decisions, from the **index** at the top of `doc/decision-log.md`.
3. Open items are tracked in `doc/plans/backlog.md`, one line each: keep each item's status current.

## Rules from the owner

1. **Never edit `doc/story/`** (story, cast, scenes), and never make text edits to the owner's writing anywhere, without a specific instruction. Point out what you'd change and wait.
   - **Exception:** `doc/story/world.md`. When the owner comments on the game world, record it there. Anything else relevant to the world can be added too, tagged `> **[Agent comment]**`. No approval needed.
2. **Agent notes** in docs are tagged clearly: `> **[Agent note]**`.
3. **The docs constrain the work.** Check them before building a feature. If the owner asks for something that conflicts with them, flag the conflict instead of silently following either side.
4. **Write a plan before each step** (`doc/plans/`, format in `doc/plans/README.md`) and get it reviewed before building. After building, update the real docs to describe what exists.
5. **Story levers:** the owner controls the story and script. When a story/script change could relieve a performance or loading problem, flag it as an option (never apply it yourself).
6. **Record decisions** in `doc/decision-log.md`: Context → Decision → Alternatives → Rationale → Status. Add dated *Update* notes instead of rewriting entries.
7. **Commit only when the owner asks.**
8. **Flag a stale page after every edit** (owner, 2026-10-20): say when the running dev page needs a reload (or a server restart) to show the change truly, e.g. a Svelte or CSS change swapped in on top of old state, a re-exported file, `vite.config.ts`. **No flag means the owner tests without reloading.**
9. **Give the dev server's link** (http://localhost:5202/ for 0.0.2, the current version; 5201 for the frozen 0.0.1) whenever there's something to look at.

## Keeping the work cheap (owner, 2026-10-13)

1. **Small edits to the ship file are the owner's.** The owner makes them in Blender and runs `npm run export:ship`; the agent comes in only if the summary shows something unexpected. When the agent does export, it uses that command too, never the steps one by one.
2. **Small fixes are light.** A change of one object or one value needs no plan (an exception to rule 4), no record script and no new scripted check unless the owner asks: one line in the doc that describes the thing, and `doc/steps/current.md`.
3. **Check narrowly while working, fully once.** One thing: `npm run probe -- <file.js>` (about 20 s). The whole scripted check (`npm run smoke`, three and a half minutes): once, at the end of a session's changes. Try a new check out with the probe before adding it to the smoke script.
4. **Edits to the `.blend` are announced** (owner, 2026-10-19): the owner says what changed in the file before a task. Before working from a new version, compare it with the last one (objects added, removed or renamed; door poses; actions; collections); **if it looks different from what was said, ask**.
5. **Big tasks are flagged before starting, and split into passes** (owner, 2026-10-19), with a stop to assess between passes. If something turns out to be more work than expected, flag it then.
6. **Blender scripts are tried on a scratch copy** first. A long check's whole output goes to a file, never through `tail`. After restoring files from git, re-run every export that touched them.

## Naming in the game world

- The in-world smartphone is a **comm** (apps: chat, mission data, camera). "Comms" also means the crew's radio channel.
- **Adam** is *they/them*. Two bodies: informally **Red** and **Blue**; technical ids **Unit 1** and **Unit 2**.

## Stack

- **Three.js `0.186.1`, pinned exactly** (no `^`). `WebGPURenderer` from `three/webgpu` (falls back to WebGL2), shaders in **TSL** from `three/tsl`. TSL changes between releases and older online examples are often wrong for r186: use the examples in `node_modules/three/examples/webgpu_*` and the official docs as the reference.
- **TypeScript 6** (not 7: `svelte-check` doesn't support it yet), **Vite 8**, **Svelte 5 in runes mode** for UI (plain Svelte + Vite, not SvelteKit).
- **Ink** (via `inkjs`) for dialogue and story state. Planned: Rapier (physics), `three-mesh-bvh`. See `doc/architecture/stack.md`.
- **Gamepad is the main input**; keyboard and mouse are secondary. Every UI must be usable with a gamepad.

## Workspace rules (`app/`)

- **Prototypes are numbered by version** (owner, 2026-10-20): each is a self-contained Vite app in `app/prototypes/<version>/`, package `@zamboni/prototype-<version>`, its own dev port (table in `doc/architecture/prototypes.md`). **The current version (0.0.2) takes the plain root scripts** (`dev`, `smoke`, `probe`…); a frozen one gets a suffix (`dev:0.0.1`, `export:0.0.1:ship`…).
- **0.0.1 is frozen** (tag `v0.0.1`): reference only; all work goes to 0.0.2; 0.0.1 is changed only if it stops running. **Versions are isolated:** each has its own game files (`public/`), tools (`tools/`) and source `.blend` (a frozen one exports from its archive in `resources/archive/<version>/`), and a frozen one its own copy of shared code.
- **Promote on second use:** code stays in its prototype until a second prototype (or the game) needs it unchanged; then it moves to `app/packages/`. Exception: `packages/ui` (the design system's code version) exists from the start.
- **Each prototype lists the build tools it uses** (`vite`, `typescript`…) in its own `devDependencies`, pinned to the root's versions: Vercel installs from the prototype folder, which installs only that workspace's dependencies.
- Shared packages are imported as source. Before keeping a change to shared code, `npm run check` must pass in every workspace.
- Game files go in the version's `public/`; test-only ones in `public/test/`.
- **Prototypes default to inverted Y** (vertical look); production builds default to normal.

## Commands (run in `app/`)

```sh
npm install          # once
npm run dev          # 0.0.2, the current version → http://localhost:5202
npm run check        # type-check every workspace
npm run build        # build every workspace
npm run smoke        # the whole scripted check of the current version
npm run probe -- f.js  # one question to the running prototype
npm run see-through  # screenshots of every room: the check while the see-through is rebuilt
npm run export:ship  # the ship: Blender → compressed game files, with a summary
npm run export:crew  # the same for the crew placed in the ship
npm run dev:0.0.1    # the frozen 0.0.1 → http://localhost:5201 (also smoke:0.0.1, probe:0.0.1, export:0.0.1:ship…)
```

## Checking your work

Type-check, build, then run the prototype in a browser and look at it (screenshot + console errors) before calling something done. Report what was and wasn't verified.
