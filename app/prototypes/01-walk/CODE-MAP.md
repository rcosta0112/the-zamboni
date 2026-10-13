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
| `doors.ts` | Hinged and sliding doors; the bulkhead doors opening when she's near; doors that open together (`group`); a moving part pushing her (also used by the ramp); the side door's walkable slope; when and where a sliding door's sound plays | `Door.update`, `updateAutoDoors`, `advance`, `createDoors`, `createDoorSounds` |
| `interaction.ts` | What can be used (not doors with a keypad, a panel or a lever; doors that open together are one target); what a keypad, a panel and the lever do; devices found by tag, or by name until they're tagged (`UNTAGGED`); picking the target; the prompt next to it; the highlight | `shipInteractables`, `findDevice`, `Interaction.update`, `placePrompt` |
| `audio.ts`, `cues.json` | Sound: cues by id (the data: file, bus, volume, falloff), buses, decoded and streamed sounds, sounds placed in the world, turning the sound on, the ship's noise and how a streamed loop repeats | `GameAudio.play`, `update`, `StreamLoop` |
| `boombox.ts` | The boombox: its ring of steps, the cassette sound then the track, the shake | `Boombox.use`, `update` |
| `ladders.ts` | Finding ladders; attaching at the foot, climbing up, stepping off at the top, letting go | `shipLadders`, `Ladders.update`, `findExit` |
| `visibility.ts` | See-through **rules**: what is cut and when (per frame, on the CPU, with BVH rays) | `updateVisibility`, `prepareRaycasts` |
| `cutaway.ts` | See-through **shader** (TSL): the hole, the dither, per-object values, the material copies | `keep`, `makeCuttable`, `setSingleSided`, `setReflections`, `updateCutaway` |
| `lights.ts` | Room lights from the ship file's markers; the four nearest her | `RoomLights.update` |
| `world.ts` | Sky, haze, sun and its shadow, the ground | `createWorld`, `updateWorld` |
| `crew.ts` | The crew placed in the ship: load, idle loop, box colliders | `loadCrew` |
| `model.ts`, `retarget.ts` | Her two models; walk/run/jump blending; retargeting Part 1's animations | `loadModels`, `AnimatedModel.update` |
| `names.ts`, `stats.ts` | Blender names as GLTFLoader gives them; the frame-time readout | `named` |

Outside `src/`: `index.html`; `src/style.css` has the prompt, help and pause overlays. Scripts run outside the browser (exports, the scripted check `npm run smoke`, the one-question `npm run probe`, the records of changes to the ship file) are listed in [`app/tools/README.md`](../../tools/README.md).

Per frame, in order (`main.ts`): input → sound (volumes, the ship's noise) → fixed steps (ladders or character, then doors and ramp) → door sounds, the boombox → camera → see-through rules → see-through shader values → interaction → world, crew, lights → render.
