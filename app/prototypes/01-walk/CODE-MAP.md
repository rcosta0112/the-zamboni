# Prototype 01: code map

> **[Agent note]** Read this before opening source files; nothing else is needed to find code. All paths are in `src/`. Keep it to what each file owns: details belong in the file's header comment and in [`README.md`](README.md).

| File | Owns | Start at |
|---|---|---|
| `main.ts` | Start-up and load order; the fixed 60 Hz step; the frame loop (who is called, in what order); dev hooks on `window` | `start` |
| `settings.ts` | Every tunable value and its starting point | `settings` |
| `tuning.ts` | The tuning panel (lil-gui): one folder per area | `createTuningPanel` |
| `input.ts` | Actions from gamepad and keyboard: move, look, jump, interact, last device used | `Input.poll`, `consume*` |
| `character.ts` | Her movement, jump and gravity; placing her on a ladder | `Character.update`, `setClimbing`, `moveDirection` |
| `physics.ts` | Rapier: ground, static colliders, her capsule and controller, moving colliders (doors), rays | `Physics.move`, `addMovingConvex`, `ray`, `castRay`, `fits` |
| `camera.ts` | Orbit camera: yaw, pitch, the fixed indoor and outdoor distances, follow, collision outside the ship | `FollowCamera.update` |
| `ship.ts` | Loading the ship and its collider; "inside"; decks; see-through units and their tags; **the cargo ramp** (its closed and open angles); hinges; the merged shadow caster | `loadShip`, `updateShip`, `closedAngle`, `groupCutUnits`, `hingeAt` |
| `doors.ts` | Hinged doors; a moving part pushing her (also used by the ramp); the side door's walkable slope | `Door.update`, `advance`, `createDoors` |
| `interaction.ts` | What can be used (not doors with a keypad; doors that open together, from `opensWith`); picking the target; the prompt next to it; the highlight | `shipInteractables`, `Interaction.update`, `placePrompt` |
| `ladders.ts` | Finding ladders; attaching at the foot, climbing up, stepping off at the top, letting go | `shipLadders`, `Ladders.update`, `findExit` |
| `visibility.ts` | See-through **rules**: what is cut and when (per frame, on the CPU, with BVH rays) | `updateVisibility`, `prepareRaycasts` |
| `cutaway.ts` | See-through **shader** (TSL): the hole, the dither, per-object values, the material copies | `keep`, `makeCuttable`, `setSingleSided`, `updateCutaway` |
| `lights.ts` | Room lights from the ship file's markers; the four nearest her | `RoomLights.update` |
| `world.ts` | Sky, haze, sun and its shadow, the ground | `createWorld`, `updateWorld` |
| `crew.ts` | The crew placed in the ship: load, idle loop, box colliders | `loadCrew` |
| `model.ts`, `retarget.ts` | Her two models; walk/run/jump blending; retargeting Part 1's animations | `loadModels`, `AnimatedModel.update` |
| `names.ts`, `stats.ts` | Blender names as GLTFLoader gives them; the frame-time readout | `named` |

Outside `src/`: `index.html`; `src/style.css` has the prompt, help and pause overlays. The scripted check is [`app/tools/smoke-01.mjs`](../../tools/smoke-01.mjs) (`npm run smoke`, see *Scripted check*). Export scripts are in [`app/tools/`](../../tools/): `export-ship.py` (ship, props, light markers, collider; every tag is read from the reference file, `The Zamboni 1.19.blend`), `build-ship-reference.py` (how that file was made from 1.18: a one-off, the record of the old lists), `compare-glb.mjs` (what differs between two exports), `export-ship-crew.py`, `export-crew-character.py`, `export-part1-character.py`.

Per frame, in order (`main.ts`): input → fixed steps (ladders or character, then doors and ramp) → camera → see-through rules → see-through shader values → interaction → world, crew, lights → render.
