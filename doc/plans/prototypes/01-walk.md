# Plan: Prototype 01 — Walk

**Status:** *built*, 2026-10-08; waiting for the owner's play-test. See [`app/prototypes/01-walk/README.md`](../../../app/prototypes/01-walk/README.md). Part of [Step 2](../../steps/02-first-prototype.md). Depends on [Repo and prototype workspace](../architecture/repo-and-prototypes.md).

## Goal

The first playable thing: a simple scene where the character walks around on a large floor plane, seen from a third-person camera. It proves the stack runs (Three.js r186, `WebGPURenderer`, TSL, Vite, TypeScript) and gives a first feel for movement and camera, which every later prototype builds on.

## Scope

**In:**
- A large floor plane with a grid, so movement and speed can be judged
- Simple lighting with shadows; a plain sky colour with distance fog
- A placeholder character: a capsule with a "nose" to show which way it faces
- Third-person movement and camera
- A small tuning panel for movement and camera values
- Frame-rate display

**Out:** collisions with anything but the floor, real character models and animation, interaction, the see-through hull, audio, UI. Each of those gets its own prototype.

## Constraints from the docs

- Third-person; **gamepad is the main input**, keyboard and mouse secondary ([`architecture/scope.md`](../../architecture/scope.md)).
- `three@0.186.1`, `WebGPURenderer` (falls back to WebGL2), TSL for any custom shading ([`architecture/stack.md`](../../architecture/stack.md)).
- Part 1's controller is the reference for feel ([`reference/big-moon-tiny-moon.md`](../../reference/big-moon-tiny-moon.md)): camera-relative movement, acceleration, smooth turning toward the movement direction, run by default and walk while Shift is held.

## Controls

Gamepad first (standard mapping, Xbox names shown); keyboard and mouse as secondary.

| Action | Gamepad | Keyboard / mouse |
|---|---|---|
| Move (camera-relative) | Left stick: speed follows how far it's pushed, from walk to run (as in Part 1) | W A S D (run); hold Shift to walk |
| Camera orbit | Right stick | Mouse (pointer lock on click; Esc releases) |
| Camera distance | D-pad up/down | Mouse wheel |
| Jump (the same button flies when wearing the backpack, which isn't in this prototype) | A | Space |
| Invert vertical look (as in Part 1) | — (tuning panel) | Y |
| Show/hide the tuning panel | Back/View | ` (backtick) |

## The work

1. **Scaffold** `app/prototypes/01-walk/` (Vite + TypeScript), dev script `dev:01` on port 5201. A page with a full-window canvas.
2. **Renderer and scene:** `WebGPURenderer` from `three/webgpu`, resize handling, a hemisphere light + one directional light with shadows, sky colour and fog. Log which backend is in use (WebGPU or WebGL2).
3. **Floor:** a 200 × 200 m plane with a TSL grid material (1 m lines, stronger 10 m lines), so the grid is a shader, not a texture.
4. **Game loop:** fixed-timestep update (60 Hz) with rendering every frame, so movement is the same at any frame rate.
5. **Input:** a small action-based input module: gamepad (Gamepad API, standard mapping, stick dead zones) first, keyboard and mouse second, pointer lock. The game reads actions (*move*, *look*, *jump*), never raw buttons.
6. **Character:** a capsule (1.8 m tall) with a facing marker. Movement: camera-relative direction, accelerate to run or walk speed, decelerate to a stop, turn smoothly to face the movement direction. Jump with gravity, landing back on the floor. Starting values from Part 1 (see "Decided" below), with the run speed kept as a separate setting so an indoor run speed can be added later.
7. **Camera:** orbits the character (yaw and pitch from the mouse, pitch limited), follows with slight smoothing, distance from the wheel within limits, aims at chest height.
8. **Tuning panel:** `lil-gui` (ships with three, `three/addons/libs/lil-gui.module.min.js`) for run/walk speed, acceleration, turn speed, jump height, gravity, camera distance, height and smoothing, stick and mouse sensitivity, stick dead zone. "Copy values" button so tuned numbers can be pasted back into the code.
9. **Stats:** frame rate and backend in a corner.

## Options

**Movement: plain code now, or Rapier physics from the start?**
- *Plain code (recommended for 01):* on a flat plane there's nothing to collide with, so physics adds setup without anything to show. The movement maths (acceleration, turning) carries over unchanged when Rapier's character controller arrives in a later prototype with obstacles, stairs and slopes.
- *Rapier now:* sets up the physics library early, but tests nothing this prototype is about.

**Placeholder or real character?**
- *Capsule (recommended):* no asset work; the point is movement and camera feel.
- *An existing model* (e.g. `resources/export/Dr. Kaufman.glb`): nicer, but brings scale, orientation and animation questions that belong in a character prototype.

## Done when

- **Agent checks:** `npm run check` passes; the prototype loads in a browser with no console errors; a screenshot shows the floor, the character and the grid; it reports which backend (WebGPU or WebGL2) it's using.
- **Owner checks:** with a gamepad first, then keyboard and mouse: walking and running feel right, the camera is comfortable, and the tuned values are agreed. Those values are recorded in the prototype's README.

## Addition (owner request, 2026-10-08): Part 1's character

To test walk/run animation, prototype 01 also shows **Part 1's Dr. Green** (from the *Big Moon Tiny Moon* Unity project), with walk, run and jump animations blended by speed. The capsule stays available as a toggle. Exported to `app/assets/test/` by `app/tools/export-part1-character.py`. A test asset only; the game's characters come from `The Crew 1.09 Dr. Green.blend` (see the [characters plan](../architecture/game-architecture/characters.md)). Details: [`app/prototypes/01-walk/README.md`](../../../app/prototypes/01-walk/README.md).

**Second addition (owner request, 2026-10-08):** the **Zamboni Dr. Green** (parka, from `The Crew 1.09 Dr. Green.blend`) driven by Part 1's walk/run/jump animations. The two rigs share bone names but not bone orientations, so the animations are **retargeted** at load time. Now the default model; Part 1's Dr. Green is still selectable.

**Third addition (owner request, 2026-10-08):** the **Zamboni's exterior** (outer hull only) landed a few metres from Dr. Green, with a **simple mesh collider**. This brings **Rapier** in earlier than planned (the plan's "Options" recommended plain movement code until there were obstacles; now there are). See the prototype README.

## Decided (owner, 2026-10-08)

- **Movement values:** start from Part 1's, read from its Unity scene (`Main.unity`): walk 1.5 m/s, run 7 m/s, turn smoothing 0.2 s, acceleration 0.1 per frame (frame-rate dependent in Part 1; about 6 m/s² at 60 fps). A second, slower run speed for indoors will probably be needed later.
- **Jump:** the character can jump, unless they're wearing the backpack (jetpack). Jump and fly use the same button. Part 1's jump height setting was 4, but its jump was switched off, so the height will be tuned from scratch.

## Open questions

- None left; waiting for plan approval.

## After

- `app/prototypes/01-walk/README.md`: what it is, how to run it, the tuned values.
- Step 2 status updated; a decision-log entry if anything was decided (e.g. movement values, camera style).
