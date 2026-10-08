# Prototype workspace

**Status:** built 2026-10-08 (Step 2). Plan: [`../plans/architecture/repo-and-prototypes.md`](../plans/architecture/repo-and-prototypes.md).

The code lets several prototypes be built and run in parallel, each testing one feature, without affecting each other or the main game.

## Structure

The whole `The Zamboni/` folder is one git repo (`resources/` is ignored). The code is one npm workspace in `app/`, with one `package-lock.json` and one `node_modules`:

```
app/
  package.json          workspace root: dev tools + scripts
  tsconfig.base.json    shared TypeScript settings (strict)
  assets/               assets shared by every prototype (served via Vite's publicDir); test-only assets in assets/test/
  tools/                scripts run outside the browser: Blender export scripts and the like
  packages/             shared code
    ui/                 @zamboni/ui: the design system's code version (Svelte 5)
  prototypes/
    NN-<slug>/          one self-contained Vite app per prototype
  game/                 the main game (later)
```

## Rules

1. **Each prototype is a self-contained Vite app** with its own page, source and dev port, so prototypes run side by side.
2. **Promote on second use.** Code belongs to the prototype that uses it, and moves into `packages/` only when a second prototype (or the game) needs it unchanged. Exception: `packages/ui` exists from the start, since it mirrors the Figma design system.
3. **Shared code is imported as source** (no build step).
4. **Changing shared code must not break other prototypes:** `npm run check` must pass everywhere. A prototype no longer worth maintaining gets a git tag (`prototype-NN-final`) before it's frozen or removed.
5. **Assets are shared** through `app/assets/`.
6. **Versions are pinned exactly** (`save-exact`); `three` stays at `0.186.1`.
7. **Inverted Y by default in prototypes** (the owner's preference); production builds default to normal.
8. **One copy of three.** Three's add-ons (GLTFLoader…) import `three`; each prototype's Vite config aliases `three` to `three/webgpu`, as the official WebGPU examples do.

## Naming

| Where | Form | Example |
|---|---|---|
| Folder | `app/prototypes/NN-<slug>` | `app/prototypes/01-walk` |
| Package | `@zamboni/prototype-NN-<slug>` | `@zamboni/prototype-01-walk` |
| Root script | `dev:NN` | `npm run dev:01` |
| Dev port | 5200 + NN | 5201 |
| Plan | `doc/plans/prototypes/NN-<slug>.md` | |

## Prototypes

| # | Prototype | What it tests | Status |
|---|---|---|---|
| 01 | [`01-walk`](../../app/prototypes/01-walk/README.md) | Movement, third-person camera, and walk/run/jump animation (Part 1's Dr. Green) on a plane | Built 2026-10-08; owner play-test pending |
| 02 | low-res | Low-resolution rendering on the real ship ([plan](../plans/prototypes/02-low-res.md)) | Planned |

## Tool versions

TypeScript **6.0.3** (not 7: `svelte-check` 4.7.6 supports TypeScript 5–6 only), Vite 8.3.3, Svelte 5.57.2 in runes mode, `@sveltejs/vite-plugin-svelte` 7.3.1, `svelte-check` 4.7.6; Node ≥ 22.12.
