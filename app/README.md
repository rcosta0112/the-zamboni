# The Zamboni — app

The game's code: one npm workspace with shared packages and several prototypes that can be built and run in parallel. Project documentation is in [`../doc/`](../doc/README.md); this workspace's design is in [`doc/architecture/prototypes.md`](../doc/architecture/prototypes.md).

## Layout

```
app/
  package.json         workspace root: shared dev tools (TypeScript, Vite, Svelte) + scripts
  tsconfig.base.json   shared TypeScript settings (strict)
  assets/              assets shared by every prototype (served at the site root)
    test/              test-only assets (e.g. Part 1's Dr. Green); not for the game
  tools/               scripts run outside the browser (e.g. Blender export scripts)
  packages/
    ui/                @zamboni/ui: the design system's code version (Svelte 5); empty for now
  prototypes/
    01-walk/           a character walking on a plane: movement, camera, walk/run/jump animation
```

## Running

```sh
npm install        # once, in app/
npm run dev:01     # prototype 01 → http://localhost:5201
npm run check      # type-check every workspace
npm run build      # build every workspace
```

## Adding a prototype

1. Write its plan first: `doc/plans/prototypes/NN-<slug>.md`.
2. Create `prototypes/NN-<slug>/` (copy `01-walk` as a starting point, without `node_modules` and `dist`).
3. In the copy: set `package.json`'s `name` to `@zamboni/prototype-NN-<slug>`, and the port in `vite.config.ts` to `5200 + NN`.
4. Add a `dev:NN` script to this folder's `package.json`, then run `npm install`.

## Rules

- **Promote on second use:** code stays in its prototype until a second prototype (or the game) needs it unchanged; then it moves to `packages/`.
- **Three.js is pinned to `0.186.1`.** Upgrade on purpose, one release at a time.
- Before keeping a change to shared code, `npm run check` must pass in every workspace.
