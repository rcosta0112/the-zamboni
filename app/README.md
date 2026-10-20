# The Zamboni — app

The game's code: one npm workspace with shared packages and several prototypes that can be built and run in parallel. Project documentation is in [`../doc/`](../doc/README.md); this workspace's design is in [`doc/architecture/prototypes.md`](../doc/architecture/prototypes.md).

## Layout

```
app/
  package.json         workspace root: shared dev tools (TypeScript, Vite, Svelte) + scripts
  tsconfig.base.json   shared TypeScript settings (strict)
  packages/
    ui/                @zamboni/ui: the design system's code version (Svelte 5)
  prototypes/          one folder per version, each isolated: its own public/ (game files) and tools/
    0.0.1/             frozen 2026-10-20 (tag v0.0.1): prototype 01, reference only
    0.0.2/             the current version: see its README.md and CODE-MAP.md
```

## Running

```sh
npm install        # once, in app/
npm run dev        # the current version (0.0.2) → http://localhost:5202
npm run check      # type-check every workspace
npm run build      # build every workspace
npm run smoke      # scripted check of the current version in headless Chrome: PASS / FAIL lines
npm run dev:0.0.1  # the frozen 0.0.1 → http://localhost:5201 (also smoke:0.0.1, probe:0.0.1, export:0.0.1:ship…)
```

**The current version takes the plain script names** (`dev`, `smoke`, `probe`, `see-through`, `export:ship|crew|player`); a frozen one gets its version as a suffix. Every script of a version: its `tools/README.md`.

## Starting a new version

How 0.0.2 was made from 0.0.1: [`doc/plans/prototypes/archive-01-start-02.md`](../doc/plans/prototypes/archive-01-start-02.md). In short:

1. Write its plan first: `doc/plans/prototypes/<version>.md`.
2. Freeze the current one: a git tag `v<version>`, its own copy of any shared code it uses, its source `.blend` packed into `resources/archive/<version>/` and its export pointed at it.
3. Copy its folder to `prototypes/<new version>/` (without `node_modules`, `dist`, `.export`). In the copy: `package.json`'s `name` (`@zamboni/prototype-<version>`) and `version`, the port in `vite.config.ts` (next free one), the console prefix. Keep `vite` and `typescript` in its `devDependencies` (see Deploying).
4. Move the plain script names in this folder's `package.json` to the new version, give the frozen one suffixed names, then run `npm install`.

## Deploying (Vercel)

One Vercel project per version:
- **Root Directory:** `app/prototypes/<version>`; keep *Include files outside the Root Directory* on (the workspace lockfile, and `packages/ui` for the current version).
- **A frozen version** has the ignored build step `git diff --quiet HEAD^ HEAD -- .`, so pushes for other versions don't rebuild it.
- **Framework:** Vite (build `vite build`, output `dist`). **Node.js:** 22.x.
- Vercel runs `npm install` inside the prototype folder, which installs **only that prototype's own dependencies**, not the workspace root's. So every prototype lists the build tools it uses (`vite`, `typescript`, …) in its own `devDependencies`, pinned to the same versions as the root. (Found 2026-10-08: the first deploy failed with `vite: command not found`.)
- The site is served from the domain root (`/`).

## Rules

- **Promote on second use:** code stays in its prototype until a second prototype (or the game) needs it unchanged; then it moves to `packages/`.
- **Three.js is pinned to `0.186.1`.** Upgrade on purpose, one release at a time.
- Before keeping a change to shared code, `npm run check` must pass in every workspace.
