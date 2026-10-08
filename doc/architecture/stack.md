# Stack

**Status:** engine decided (2026-10-08, see [`../decision-log.md`](../decision-log.md)); libraries *proposed*, to be confirmed and pinned at repo setup.

## Engine

| | Choice | Version | Notes |
|---|---|---|---|
| Rendering | [Three.js](https://threejs.org/), plain (no React Three Fiber) | `three@0.186.1`, pinned exactly | `WebGPURenderer`, which falls back to WebGL2 automatically where WebGPU isn't available |
| Shaders | TSL (Three Shading Language) | ships with three | One code path for WebGPU and WebGL2. Reference: the official TSL docs and `node_modules/three/examples/webgpu_*`, not older online examples |
| Types | `@types/three` | `0.186.0` | Latest available; doesn't need to match three's patch version |
| Language | TypeScript | `6.0.3`, pinned | Strict mode. Not 7: `svelte-check` supports TypeScript 5–6 only |
| Build / dev server | [Vite](https://vite.dev/) | `8.3.3`, pinned | |

**Upgrade rule:** three is pinned with no `^`. TSL and `WebGPURenderer` still change between releases, so upgrades happen on purpose, one release at a time, after reading the [migration guide](https://github.com/mrdoob/three.js/wiki/Migration-Guide).

## Libraries (proposed; Ink decided)

| Need | Library | Version (2026-10-08) | Why |
|---|---|---|---|
| Physics: character controller, pickable objects, doors | [Rapier](https://rapier.rs/) (`@dimforge/rapier3d-compat`) | 0.21.0, in use in prototype 01 since 2026-10-08. Known issue: the character controller sinks through very large box colliders; use meshes or smaller boxes for big grounds | The immersive-sim side needs real physics objects (pick up, drop, throw). Rapier also has a kinematic character controller, so one system handles both the character and the props |
| Fast raycasts (camera collision, interaction targeting) | [`three-mesh-bvh`](https://github.com/gkjohnson/three-mesh-bvh) | 0.9.16 | Accelerates raycasts against the ship's detailed meshes |
| Dialogue and story state | [Ink](https://www.inklestudios.com/ink/) via [`inkjs`](https://github.com/y-lohse/inkjs) | 2.4.0 | Mature, text-based, runs in the browser; one story file drives VN dialogue, comm chats and barks. See "Dialogue language" below |
| Post-processing (bloom on emissives and CRTs) | Three's built-in TSL post-processing (`PostProcessing` + bloom node) | ships with three | The `postprocessing` npm library is WebGL-only, so it doesn't fit `WebGPURenderer` |
| Audio | Web Audio through Three's `AudioListener` / `PositionalAudio` | ships with three | See [`audio.md`](audio.md) |
| UI (dialogue box, comm and its apps, menus) | [Svelte 5](https://svelte.dev/) (runes mode) rendering an HTML/CSS overlay above the canvas, built with `@sveltejs/vite-plugin-svelte` | `svelte` 5.57.2, plugin 7.3.1 | Decided 2026-10-08. Text-heavy, stateful UI is far easier as components in the DOM than in WebGL; the agent can check it with normal browser tools; same framework as the owner's Eigodojo design system. Plain Svelte + Vite, not SvelteKit (the game is one page) |
| Input | Browser Gamepad API (standard mapping) + keyboard/mouse events, behind an action map | — | Gamepad is the main input |

## Dialogue language: Ink vs Yarn Spinner

Part 1 used Yarn (`Dialog 1.01.yarn`). **Decided (owner, 2026-10-08): Ink.** `inkjs` is a maintained, complete JavaScript runtime; Yarn Spinner's official runtimes target Unity and Godot, and its JavaScript ports are less complete. Both are plain text and both suit an AI agent. Docs: [Writing with Ink](https://github.com/inkle/ink/blob/master/Documentation/WritingWithInk.md), [Running your Ink](https://github.com/inkle/ink/blob/master/Documentation/RunningYourInk.md), [Inky](https://github.com/inkle/inky) (editor), [inkjs](https://github.com/y-lohse/inkjs).

## Tooling

- **Blender** for modelling, level layout, lighting bakes and cutscene animation; export to glTF. See [`asset-pipeline.md`](asset-pipeline.md).
- **Inky** (Ink's editor) for writing and testing dialogue, optional; `.ink` files can also be edited as plain text.
- **Browser automation** (Playwright) so the agent can run the game, take screenshots and read console errors.
- **Node** v22 (installed: v22.13.1).
