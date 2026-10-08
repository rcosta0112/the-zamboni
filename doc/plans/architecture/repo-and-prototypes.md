# Plan: Repo and prototype workspace

**Status:** *done*, 2026-10-08. Built as planned, except: TypeScript is pinned to 6.0.3 (not 7) because `svelte-check` doesn't support 7 yet. Documented in [`architecture/prototypes.md`](../../architecture/prototypes.md). Part of [Step 2](../../steps/02-first-prototype.md).

## Goal

Set up the git repo and a code structure where **several prototypes can be built in parallel**, each testing a different feature, without affecting each other or the main game code.

## Constraints from the docs

- The whole `The Zamboni/` folder is the repo; `resources/` is ignored ([decision log](../../decision-log.md)).
- `app/` holds code and production assets ([`architecture/README.md`](../../architecture/README.md)).
- Plain Three.js `0.186.1` (pinned) + TSL, TypeScript, Vite, Svelte 5 for UI ([`architecture/stack.md`](../../architecture/stack.md)).
- **Change to the docs:** [`architecture/README.md`](../../architecture/README.md) currently shows a single app in `app/src/`. This plan replaces that with a workspace of prototypes plus shared packages. The architecture doc gets updated once this is approved and built.
- **Change to the docs:** [`asset-pipeline.md`](../../architecture/asset-pipeline.md) and [`audio.md`](../../architecture/audio.md) put game assets in `app/public/assets/`. With several apps sharing them, they move to `app/assets/`; those docs get updated too.

## Proposed structure

One npm-workspaces project inside `app/`: one `package-lock.json`, one `node_modules`, and each prototype and shared package with its own `package.json`.

```
The Zamboni/                   git repo root
  .gitignore                   resources/, node_modules/, dist/, …
  CLAUDE.md                    agent instructions: conventions, rules, where docs are
  app/
    package.json               workspace root: shared dev tooling + scripts
    tsconfig.base.json         shared TypeScript settings (strict)
    assets/                    production assets shared by every prototype (glTF, audio, textures)
    packages/                  shared code, added when needed (see "promote on second use")
      engine/                  @zamboni/engine: renderer setup, loop, input, player, camera…
      ui/                      @zamboni/ui: the design system's code version (Svelte 5): tokens + components
    prototypes/
      01-walk/                 @zamboni/prototype-01-walk: a Vite app
        package.json  vite.config.ts  index.html  src/
      02-…/
    game/                      the main game, created when the prototypes have proven enough
  doc/
  resources/                   ignored
```

### Rules

1. **Each prototype is a self-contained Vite app** with its own entry page, its own source and its own fixed dev port. Prototypes can run side by side.
2. **Code belongs to the prototype that uses it.** It moves into `packages/` only when a second prototype (or the game) needs it unchanged: the "promote on second use" rule (from Eigodojo). That keeps experiments from leaking into shared code.
   **Exception:** `packages/ui` (the design system's code version) exists from the start, because it mirrors the Figma design system rather than growing out of a prototype.
3. **Shared code is imported as source** (no build step), so a change in `packages/` shows up in every prototype immediately.
4. **Changing shared code must not break other prototypes.** Before a shared change is kept, every prototype must still type-check and build (`npm run check`). If an old prototype is no longer worth keeping working, it gets a git tag (`prototype-01-final`) so it can always be checked out and run as it was, and is then removed or frozen.
5. **Assets are shared.** `app/assets/` is served to every prototype (Vite's `publicDir`), so exported glTF and audio are copied in once.
6. **Dependencies are declared once at the workspace root where possible.** `three` stays pinned to `0.186.1`. A prototype that needs to test a different version can pin its own.

### Naming

| Where | Form | Example |
|---|---|---|
| Folder | `app/prototypes/NN-<slug>` | `app/prototypes/01-walk` |
| Package name | `@zamboni/prototype-NN-<slug>` | `@zamboni/prototype-01-walk` |
| Root script | `dev:NN` | `npm run dev:01` |
| Dev port | 5200 + NN | 01 → 5201 |
| Plan | `doc/plans/prototypes/NN-<slug>.md` | [`01-walk.md`](../prototypes/01-walk.md) |

Numbers are assigned in the order prototypes are started. A prototype keeps its number when it's retired.

### Scripts (workspace root)

```sh
npm install          # once, in app/
npm run dev:01       # prototype 01 → http://localhost:5201
npm run check        # type-check every workspace
npm run build        # build every prototype
```

## The work

1. **Git:** `git init` at `The Zamboni/`, `.gitignore`, `.gitattributes` (normalise line endings to LF for text files).
2. **Workspace root** in `app/`: `package.json` with workspaces (`packages/*`, `prototypes/*`, `game`), `tsconfig.base.json`, pinned dev dependencies (TypeScript, Vite, Svelte, `svelte-check`), the scripts above. Svelte runs in runes mode project-wide.
   Then an empty `packages/ui` with the Svelte setup and a token file, ready for the design system.
3. **`CLAUDE.md`** at the repo root, covering:
   - where the docs are and that they're the source of truth;
   - the rules the owner has set: never edit `doc/story/` or the owner's text without specific instructions; world comments go in `doc/story/world.md`; flag requests that conflict with the docs;
   - the three version pin, the TSL reference (`node_modules/three/examples/webgpu_*`, official docs), the prototype rules above.
4. **`app/README.md`**: how to run, the layout, how to add a prototype.
5. **First commit**, only when the owner asks.

## Options

**Shared code from day one, or only on second use?**
- *Promote on second use (recommended):* prototype 01 keeps all its code; `packages/engine/` is created when prototype 02 needs the same character controller. Nothing is shared before it's proven.
- *Engine package from day one:* cleaner on paper, but it guesses at what's shared before any of it exists.

**Workspace tool:** npm workspaces (recommended: built into npm, no extra tool). pnpm handles large workspaces better, but adds a tool to install.

## Done when

- `npm install` and `npm run dev:01` work from a fresh clone.
- `npm run check` passes.
- Two prototypes can run at the same time on different ports (checked once prototype 02 exists).

## After

- Rewrite the folder layout in [`architecture/README.md`](../../architecture/README.md) to match what was built.
- Add a short `architecture/prototypes.md` describing the workspace and its rules.
- Decision-log entry for the prototype workspace.
