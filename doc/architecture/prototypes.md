# Prototype workspace

**Status:** built 2026-10-08 (Step 2). Plan: [`../plans/architecture/repo-and-prototypes.md`](../plans/architecture/repo-and-prototypes.md). *Update 2026-10-20 (item 51):* prototypes are numbered by version, each version is isolated (its own game files, tools and source art), prototype 01 is frozen as 0.0.1. Plan: [`../plans/prototypes/archive-01-start-02.md`](../plans/prototypes/archive-01-start-02.md).

The code lets several prototypes be built and run in parallel, each testing one feature, without affecting each other or the main game.

## Structure

The whole `The Zamboni/` folder is one git repo (`resources/` is ignored). The code is one npm workspace in `app/`, with one `package-lock.json` and one `node_modules`:

```
app/
  package.json          workspace root: dev tools + scripts
  tsconfig.base.json    shared TypeScript settings (strict)
  packages/             shared code
    ui/                 @zamboni/ui: the design system's code version (Svelte 5)
  prototypes/
    <version>/          one self-contained Vite app per version
      public/           its game files (test-only ones in public/test/)
      tools/            its scripts run outside the browser: exports, checks, Blender records
  game/                 the main game (later)
```

## Rules

1. **Each prototype is a self-contained Vite app** with its own page, source and dev port, so prototypes run side by side.
2. **Promote on second use.** Code belongs to the prototype that uses it, and moves into `packages/` only when a second prototype (or the game) needs it unchanged. Exception: `packages/ui` exists from the start, since it mirrors the Figma design system.
3. **Shared code is imported as source** (no build step).
4. **Changing shared code must not break other prototypes:** `npm run check` must pass everywhere. A version no longer maintained gets a git tag (`v<version>`) before it's frozen. **A frozen version doesn't use shared code:** it keeps its own copy (0.0.1 has `@zamboni/ui`'s files in `src/ui/`), so nothing done for the current version can change it. It's changed only if it stops running.
5. **Each version has its own game files** in its `public/`, its own tools in `tools/`, and exports from its own source file: the current version from the working `.blend`, a frozen one from its archive in `resources/archive/<version>/` ([`asset-pipeline.md`](asset-pipeline.md#the-ships-reference-file)). Git stores identical files once, so a copy costs nothing until it changes. (Until 2026-10-20: shared through `app/assets/`, tools in `app/tools/`.)
6. **Versions are pinned exactly** (`save-exact`); `three` stays at `0.186.1`.
7. **Inverted Y by default in prototypes** (the owner's preference); production builds default to normal.
8. **Each prototype lists its own build tools** (`vite`, `typescript`…) in `devDependencies`, at the root's versions, so it builds alone: Vercel installs from the prototype folder, which only installs that workspace's dependencies. **Each has its own Vercel project** (*Root Directory* `app/prototypes/<version>`); a frozen one has the ignored build step `git diff --quiet HEAD^ HEAD -- .`, so other pushes don't rebuild it.
9. **One copy of three.** Three's add-ons (GLTFLoader…) import `three`; each prototype's Vite config aliases `three` to `three/webgpu`, as the official WebGPU examples do.

## Naming (owner, 2026-10-20)

| Where | Form | 0.0.1 | 0.0.2 |
|---|---|---|---|
| Folder | `app/prototypes/<version>` | `app/prototypes/0.0.1` | `app/prototypes/0.0.2` |
| Package | `@zamboni/prototype-<version>`, `version` field the same | `@zamboni/prototype-0.0.1` | `@zamboni/prototype-0.0.2` |
| Root scripts | **the current version takes the plain names**; an archived one gets its version as a suffix | `dev:0.0.1`, `smoke:0.0.1`, `probe:0.0.1`, `see-through:0.0.1`, `export:0.0.1:ship\|crew\|player` | `dev`, `smoke`, `probe`, `see-through`, `export:ship\|crew\|player` |
| Dev port | one per version, in the table below | 5201 | 5202 |
| Git tag | `v<version>`, when it's frozen | `v0.0.1` | |
| Console prefix | `[<version>]` | `[0.0.1]` | `[0.0.2]` |
| Plan | `doc/plans/prototypes/<version>.md` | | |

The version shows at the top of the tuning panel, read from the prototype's `package.json` at build time.

## Prototypes

| Version | What it is | Port | Status |
|---|---|---|---|
| [0.0.1](../../app/prototypes/0.0.1/README.md) | Prototype 01 (`01-walk`, [plan](../plans/prototypes/01-walk.md)): Dr. Green in and around the ship: movement, camera, the see-through hull, doors, ladders, the jetpack, sound, the start screen | 5201 | **Frozen** 2026-10-20 (tag `v0.0.1`); reference only |
| [0.0.2](../../app/prototypes/0.0.2/README.md) | Starts as a copy of 0.0.1; for the architecture (item 49) and the exports (item 48), the ladder and all open work | 5202 | **Current** |
| – | Low-res: low-resolution rendering on the real ship ([plan](../plans/prototypes/low-res.md)) | – | Set aside (owner, 2026-10-20); its features later |

## Tool versions

TypeScript **6.0.3** (not 7: `svelte-check` 4.7.6 supports TypeScript 5–6 only), Vite 8.3.3, Svelte 5.57.2 in runes mode, `@sveltejs/vite-plugin-svelte` 7.3.1, `svelte-check` 4.7.6; Node ≥ 22.12.
