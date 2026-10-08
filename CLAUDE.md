# The Zamboni

A short third-person story/exploration game (visual novel × immersive sim) for the web, by Studio Cataplasma. Part 2 of a story begun in *Big Moon Tiny Moon*.

## Where things are

- `doc/`: the documentation, the project's **source of truth**. Start at `doc/README.md`. Decisions: `doc/decision-log.md`. Current work: `doc/steps/`. Plans: `doc/plans/`.
- `app/`: the code (npm workspace). See `app/README.md`.
- `resources/`: source art (Blender, textures, audio masters). **Not in git**; never add it.

## Rules from the owner

1. **Never edit `doc/story/`** (story, cast, scenes), and never make text edits to the owner's writing anywhere, without a specific instruction. Point out what you'd change and wait.
   - **Exception:** `doc/story/world.md`. When the owner comments on the game world, record it there. Anything else relevant to the world can be added too, tagged `> **[Agent comment]**`. No approval needed.
2. **Agent notes** in docs are tagged clearly: `> **[Agent note]**`.
3. **The docs constrain the work.** Check them before building a feature. If the owner asks for something that conflicts with them, flag the conflict instead of silently following either side.
4. **Write a plan before each step** (`doc/plans/`, format in `doc/plans/README.md`) and get it reviewed before building. After building, update the real docs to describe what exists.
5. **Story levers:** the owner controls the story and script. When a story/script change could relieve a performance or loading problem, flag it as an option (never apply it yourself).
6. **Record decisions** in `doc/decision-log.md`: Context → Decision → Alternatives → Rationale → Status. Add dated *Update* notes instead of rewriting entries.
7. **Commit only when the owner asks.**

## Naming in the game world

- The in-world smartphone is a **comm** (apps: chat, mission data, camera). "Comms" also means the crew's radio channel.
- **Adam** is *they/them*. Two bodies: informally **Red** and **Blue**; technical ids **Unit 1** and **Unit 2**.

## Stack

- **Three.js `0.186.1`, pinned exactly** (no `^`). `WebGPURenderer` from `three/webgpu` (falls back to WebGL2), shaders in **TSL** from `three/tsl`. TSL changes between releases and older online examples are often wrong for r186: use the examples in `node_modules/three/examples/webgpu_*` and the official docs as the reference.
- **TypeScript 6** (not 7: `svelte-check` doesn't support it yet), **Vite 8**, **Svelte 5 in runes mode** for UI (plain Svelte + Vite, not SvelteKit).
- **Ink** (via `inkjs`) for dialogue and story state. Planned: Rapier (physics), `three-mesh-bvh`. See `doc/architecture/stack.md`.
- **Gamepad is the main input**; keyboard and mouse are secondary. Every UI must be usable with a gamepad.

## Workspace rules (`app/`)

- Each prototype is a self-contained Vite app in `app/prototypes/NN-<slug>/`, package `@zamboni/prototype-NN-<slug>`, root script `dev:NN`, dev port `5200 + NN`.
- **Promote on second use:** code stays in its prototype until a second prototype (or the game) needs it unchanged; then it moves to `app/packages/`. Exception: `packages/ui` (the design system's code version) exists from the start.
- **Each prototype lists the build tools it uses** (`vite`, `typescript`…) in its own `devDependencies`, pinned to the root's versions: Vercel installs from the prototype folder, which installs only that workspace's dependencies.
- Shared packages are imported as source. Before keeping a change to shared code, `npm run check` must pass in every workspace.
- Shared production assets go in `app/assets/`; test-only assets in `app/assets/test/`.
- **Prototypes default to inverted Y** (vertical look); production builds default to normal.

## Commands (run in `app/`)

```sh
npm install          # once
npm run dev:01       # prototype 01 → http://localhost:5201
npm run check        # type-check every workspace
npm run build        # build every workspace
```

## Checking your work

Type-check, build, then run the prototype in a browser and look at it (screenshot + console errors) before calling something done. Report what was and wasn't verified.
