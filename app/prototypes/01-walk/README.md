# Prototype 01 — Walk

A character walking around a 200 × 200 m floor, seen from a third-person camera: **Part 1's Dr. Green** with walk, run and jump animations (switchable back to a capsule). Proves the stack (Three.js r186 `WebGPURenderer`, TSL, Vite, TypeScript) and gives a first feel for movement and camera. Plan: [`doc/plans/prototypes/01-walk.md`](../../../doc/plans/prototypes/01-walk.md).

## Run

```sh
cd app
npm run dev:01     # → http://localhost:5201
```

## Controls

| Action | Gamepad | Keyboard / mouse |
|---|---|---|
| Move | Left stick (speed follows how far it's pushed) | W A S D (run), hold Shift to walk |
| Camera | Right stick | Mouse (click the view to capture it; Esc releases) |
| Camera distance | D-pad up/down | Mouse wheel |
| Jump | A | Space |
| Interact (open, close, use the target) | B / Circle | E |
| Climb a ladder | Walk into it; toward it = up, away = down; A lets go | Same; Space lets go |
| Invert vertical look (on by default in prototypes) | (tuning panel) | Y |
| Tuning panel | View/Back | ` (backtick) |

**Indoor speeds:** inside the ship (the same test as the see-through hull: her chest inside the ship's interior box) she uses the *indoor walk speed* and *indoor run speed* sliders (Movement folder) instead of the outdoor ones. Starting values: walk 1.5 m/s, run 3.5 m/s; the owner is tuning them. The walk/run animation blend follows whichever pair is in use. Going in at a full run, she drops to the indoor speed almost instantly (the normal deceleration).

**Pause:** the game pauses when the mouse is released (Esc, or the browser taking it back). Click the view to capture it again and resume, or press any gamepad button. The tuning panel still works while paused.

The **Copy values** button in the tuning panel copies all settings as JSON.

## The character models

Two models, switchable in the tuning panel (*Character model → model*); the capsule is still available.

### Zamboni Dr. Green (default)

The parka Dr. Green from `resources/models/The Crew 1.09 Dr. Green.blend`, **driven by Part 1's animations**. Exported to `app/assets/test/green-parka.glb` (460 KB, uncompressed) with [`app/tools/export-crew-character.py`](../../tools/export-crew-character.py):

```sh
blender -b "resources/models/The Crew 1.09 Dr. Green.blend" --python app/tools/export-crew-character.py -- \
  --armature "Dr. Green Parka" --objects "Dr. Green Mesh.004,Gadget.004,Gadget.005,Backpack.002" \
  --out app/assets/test/green-parka.glb --force-double-sided
```

The script exports in the rest pose at the origin, applies modifiers (the mesh is mirrored), leaves out bones that are flagged as deforming but carry no weights (`Elbow_r`, the IK pointer, plus `Foot_l` and `Foot_r`), and reports double-sided materials (a performance cost, to be fixed in Blender). This model uses `--force-double-sided` as a **temporary** workaround: the hood is a single surface on materials with backface culling on (`Black`, `Teal`, `White`, `Brown`, `Dark Brown`), so its back was invisible. Drop the flag once the hood is fixed in Blender.

**Retargeting** ([`src/retarget.ts`](src/retarget.ts)): both rigs use the same bone names, but the bones are rolled differently, so Part 1's tracks can't be copied across directly. At load time, each Part 1 clip is sampled at 30 fps; for every bone, its rotation away from rest (in world space) is applied to the Zamboni bone of the same name on top of that bone's own rest pose, and `Body`'s movement is scaled by the ratio of hip heights. The result is ordinary animation clips, so playback costs nothing extra. Bones Part 1 doesn't have (`Hood`) stay at rest.

**Size:** about 0.75 m tall in the crew file; scaled to Part 1's 1.23 m by default so the movement speeds compare like for like (*Zamboni height* in the tuning panel).

### Part 1 Dr. Green

Part 1's Dr. Green (*Big Moon Tiny Moon*) with its own animations: `app/assets/test/part1-dr-green.glb` (272 KB), exported from `C:\Users\31658\Projects\Big Moon Tiny Moon\Assets\Models\Characters\Dr.Green.fbx` with [`app/tools/export-part1-character.py`](../../tools/export-part1-character.py):

```sh
blender -b --python app/tools/export-part1-character.py -- "<path>/Dr.Green.fbx" app/assets/test/part1-dr-green.glb
```

1,236 triangles + jetpack, flat colours, **1.23 m tall** as authored. Animations: `standing` (a single pose), `walking` (1.46 s), `running` (0.88 s), `jumping`, `jumping_2`, `flying`.

### Animation playback (both models)

- **Blending:** standing → walking → running by speed; walk and run share one cycle position, so the feet stay on the same step while blending. Each cycle plays at normal speed when the character moves at its reference speed (*walk cycle at* / *run cycle at*); faster or slower movement speeds the cycle up or down.
- **Starting and stopping:** the movement stops almost instantly (Part 1's deceleration), but the animation follows a smoothed speed, so the stride eases out and the legs settle instead of snapping. Tunable: *start blend* (0.08 s) and *stop blend* (0.18 s).
- **Jump:** the jump animation plays from the start on take-off and holds its last frame until landing.

## The ship and collisions

**The Zamboni, outside and in**, landed about 12 m ahead with its back to the start and the **cargo ramp open**: `app/assets/test/zamboni-ship.glb` (1.53 MB) and its collider `zamboni-ship-col.glb` (104 KB), exported from `resources/models/The Zamboni 1.18.blend` with [`app/tools/export-ship.py`](../../tools/export-ship.py), then its textures capped at 512 px and both compressed with Meshopt (glTF-Transform):

```sh
blender -b "resources/models/The Zamboni 1.18.blend" --python app/tools/export-ship.py -- \
  --out <raw>/zamboni-ship.glb --collider-out <raw>/zamboni-ship-col.glb
cd app
npx gltf-transform resize <raw>/zamboni-ship.glb <raw>/zamboni-ship-512.glb --width 512 --height 512
npx gltf-transform meshopt <raw>/zamboni-ship-512.glb assets/test/zamboni-ship.glb
npx gltf-transform meshopt <raw>/zamboni-ship-col.glb assets/test/zamboni-ship-col.glb
```

- **What's in it (77 objects):** the exterior (hull, windshield, engine pods, landing gear, side door, top hatch, lab windows, the cargo ramp) and the **large interior elements**: floors, bulkheads, walls and ceilings, consoles and dashboards, interior doors, ceiling lights; crew quarters (bunks, couch, table, galley, stove, lockers, ladder); cockpit (seats, dials, monitors); engineering (benches, cabinets, 3D printer, power supplies, the Contraption); cargo bay (sledge, pallet, locker, head, jetpack racks, ladder). Collections excluded from the view layer in the file are included for the export only. **Small props** (mugs, books, chests, computers…) are left for a later step.
- **Size:** 10 MB uncompressed (the Contraption alone is 21,500 triangles) → 1.53 MB with Meshopt; three.js decodes it with its `MeshoptDecoder`.
- **Scale:** the same factor as the Zamboni Dr. Green (crew and ship share units in the Blender files).
- **Collider:** its own file, positions only: everything except the ramp, joined at full detail (29,139 triangles); the four densest pieces of furniture (dials, 3D printer, Contraption, sledge) as convex hulls. A decimated version closed the cargo opening. Ladders block like walls: no climbing yet.
- **See-through hull:** structure (tagged `structure: true`: hull, walls, ceilings, floors, doors…) is cut by the hole while something solid hides her; furniture is cut near the camera above her waist, and near her only while it hides her head or a third of her. Exceptions: `seeThrough: "keep"` (the 3D printer), `seeThrough: "solid"` (all cockpit furniture, the engineering ceiling machine, the red sled: always visible on her deck), objects attached to a bulkhead behave like it (and with *bulkheads always visible*, on by default, bulkheads and what's attached to them are never cut while she's on their deck), `divider: true` (bulkheads and inner walls: solid while the camera is inside, unless they hide her). Raycasts use `three-mesh-bvh`. The cargo ramp is cut like the hull while closed or moving, never while open. Never cut: `cuttable: false` (the landing gear). Tags are set by the export script until they're set in Blender. Upward-facing surfaces below her feet are never cut, so the floors stay. Details: [`doc/features/see-through-hull.md`](../../../doc/features/see-through-hull.md).
- **Cargo ramp** (`Door Cargo`): hinged on **its origin in the Blender file**, at the bottom of the hull opening. Meshopt compression moves node origins, so the export records the hinge as a `hinge` custom property and the game builds the hinge there (closed = exactly as modelled). Opens outward until its far end touches the ground (92° from closed; it leans outward when closed, so it ends ~25° below horizontal). *Cargo ramp open* in the tuning panel animates it (1.5 s). Convex collider while moving or closed; fully open, a walkable slope from where it meets the ground to the cargo floor (the ramp has a lip on the ground).
- **Doors, keypads, ladders** (2026-10-09): the side door, the trapdoor, the roof hatches, the fridge, cupboard and locker doors open and close (all start closed but the trapdoor); the open side door is a ramp; the upper keypad by the side door works the ramp, the lower one the side door; the cargo bay and crew quarters ladders can be climbed. Point the camera at a door within her reach and press E / Circle. Details: [`doc/features/interaction.md`](../../../doc/features/interaction.md). A moving door pushes her out of its way (or stops, if she's pinned). Tuning panel: *Interaction* folder (reach, how far from the screen centre, highlight, door time, doors push her, climb speed).
- **Double-sided materials** (export report, to fix in Blender): see [`doc/architecture/asset-pipeline.md`](../../../doc/architecture/asset-pipeline.md).

**Physics:** [Rapier](https://rapier.rs/) 0.21.0 ([`src/physics.ts`](src/physics.ts)). The character is a capsule (radius 0.28 m, 1.23 m tall) moved by Rapier's kinematic character controller: it slides along walls and steps over ledges up to 0.3 m. Gravity and jumping stay in `character.ts`. Animation follows the speed the character *actually* moved, so running into the hull settles into standing.

> **Ground check (2026-10-08):** Rapier's own "grounded" flag also says grounded against steep, leaning walls. That reset her fall speed every step (she slid down walls slowly) and let her jump again off them (she could climb to the top floor). She now counts as grounded only if Rapier says so **and** a ray straight down from her centre finds a surface no steeper than 45° within a few centimetres of her feet. (A downward sphere was tried first: it also touched edges, like the cargo floor's rear edge, and stopped her at the top of the ramp.) Known leftovers: pushing into a wall that leans over her can wedge her a few cm up, and walking under the hull's belly edge outside presses her a few cm into the ground; both settle when she moves away.

> **Rapier note (2026-10-08):** with Rapier 0.19–0.21, the character controller sinks through a very large box collider (a 1000 m ground box); a smaller box or a triangle mesh works. The ground is therefore a flat two-triangle mesh. Also, `@types/three` pulls in an old Rapier (0.12.0) for its type definitions, so two copies are installed; the prototype uses the pinned 0.21.0.

## Props, room lights and the crew

- **Props** (2026-10-09): everything else in the ship file's rooms (books, mugs, jars, test tubes, the chess set, crates, jetpacks, keyboards, the `KEEP CLEAR` stencil…). Big ones (≥ ~0.4 m) are separate objects with colliders; small ones are merged into one object per room collection (`Props Galley`, `Props Shelf`…). Props don't cast shadows. Props in the cockpit are always visible.
- **Room lights:** point lights at 7 markers from the ship file: two each in the cargo bay, engineering and crew quarters (positions of the file's lights there), one new one in the cockpit (it has none in the file). The **4 nearest her** are on (the budget), moving and fading as she walks; tuning panel → *Room lights*: *all* (all 7; rebuilds every shader once), brightness, range. Flagged and not imported: `Area.004`, `Area.005`, `Area.006`, `Area.008`, `Area.009` (crew quarters ceiling panels, 1–2 W), `Area.010` (dim blue fill), `Area.011` (the laptop's glow), `Area.012` (3 W, crew quarters), `Area.014` (20 W side light, crew quarters).
- **The crew** (`app/assets/test/zamboni-crew.glb`, from [`app/tools/export-ship-crew.py`](../../tools/export-ship-crew.py)): Dr. Kaufman on the crew quarters couch with her idle loop (13.4 s); both Adam bodies and Dr. Ogawa in the cockpit, static poses. Never cut by the see-through hull; a box collider each.

## See-through hull and camera collision

Inside the ship, a round, dither-edged hole is cut through everything between the camera and her chest (hull, walls, ceiling, furniture); outside, the camera collides with the ship instead. Details: [`doc/features/see-through-hull.md`](../../../doc/features/see-through-hull.md). Code: [`src/cutaway.ts`](src/cutaway.ts) (TSL), wired up in `src/ship.ts` (which surfaces, the cargo bay volume) and `src/main.ts`; camera collision in `src/camera.ts` + `Physics.castRay`. Tuning panel → *See-through hull*.

## Resolution and anti-aliasing

Tuning panel → *Rendering*:
- **Max pixel ratio** from 0.1 to 3: below 1, the 3D is rendered with fewer pixels than the window has (0.25 on a 1280×720 window = 320×180).
- **Pixelated upscale** (on by default): the browser stretches a small render with hard, square pixels instead of smoothing it.
- **Anti-aliasing** (MSAA, on by default): smooths edges; it's fixed when the renderer is created, so switching it reloads the page (remembered in the browser's local storage).

Together these give the low-resolution look planned for [prototype 02](../../../doc/plans/prototypes/02-low-res.md) on this scene.

## The look

Lit like Part 1's Blender scenes, from `Big Moon Tiny Moon/Models/Props/Camp Site 1.01.blend` (tuning panel → *Look*), and checked side by side against the owner's reference render:

| | Blender (Camp Site 1.01) | Here |
|---|---|---|
| World (ambient + background) | Gradient by direction: light cyan `(0.205, 0.831, 1)` at and below the horizon → blue `(0, 0.468, 1)` → deep blue `(0, 0.209, 1)` overhead; Ease interpolation; strength 1 | Same gradient as the background texture. Its lighting is a **hemisphere light** whose colours are computed from the gradient (cosine-weighted average facing up; the cyan facing down), intensity π × strength |
| Sun | Yellow `(0.993, 1, 0.377)`, strength 7.5, angle 0.5°, ~20° elevation | Directional light, same colour and strength (same units), small shadow blur |
| Colour management | Filmic | **ACES, exposure 0.85**: three.js has no Filmic; compared with the reference, AgX came out grey with salmon reds and Neutral over-saturated. Selectable in the panel |

- **Mist removed** (owner, 2026-10-08). A distance haze in the horizon colour remains, to hide the floor's edge (*distance haze*).
- **Why a hemisphere light and not an environment map:** setting the gradient as `scene.environment` (directly, and pre-filtered with PMREM) didn't light anything in this setup: the shaded side came out black. For these matte, flat-colour materials the diffuse part is what matters, and the hemisphere light gives it exactly. Worth revisiting if shiny materials need sky reflections.
- **Ground:** near-white snow with faint variation; optional speed *grid*.

## Code

| File | What |
|---|---|
| `src/main.ts` | Renderer, fixed 60 Hz simulation step with interpolated rendering, the frame loop |
| `src/input.ts` | Action-based input: gamepad first (standard mapping, radial dead zone), keyboard/mouse second |
| `src/character.ts` | Movement (Part 1's controller: acceleration, smooth turning, move along facing) + jump; capsule placeholder |
| `src/model.ts` | Loads both models; blends standing/walk/run by speed; jump |
| `src/physics.ts` | Rapier world: ground, ship collider, capsule + character controller |
| `src/ship.ts` | Loads the ship exterior, places it, builds its collider |
| `src/cutaway.ts` | See-through hull: the TSL cut, cuttable material copies (one per source material) |
| `src/lights.ts` | Room lights: markers from the ship file, the 4 nearest her (fading), or all |
| `src/crew.ts` | The crew placed in the ship: loads, loops Dr. Kaufman's animation, box colliders |
| `src/visibility.ts` | See-through rules: does the structure hide her (the hole), which furniture hides her (coverage), exceptions; fades with hysteresis; BVH raycasts |
| `src/retarget.ts` | Retargets animations between skeletons with the same bone names but different bone orientations |
| `src/camera.ts` | Third-person orbit camera with smoothed follow |
| `src/world.ts` | Sky, fog, lights, sun shadow that follows the character, TSL grid floor |
| `src/settings.ts` | All tunable values and their starting points |
| `src/tuning.ts`, `src/stats.ts` | Tuning panel (lil-gui), frame-time readout |

## Starting values

From Part 1 (*Big Moon Tiny Moon*, `Main.unity`): walk 1.5 m/s, run 7 m/s, acceleration ≈ 6 m/s², deceleration ≈ 120 m/s², turn smoothing 0.2 s. Jump (1 m, gravity 20 m/s²) is new: Part 1's jump was switched off.

## Results

| Date | Machine | Browser | Backend | Result |
|---|---|---|---|---|
| 2026-10-08 | Owner's PC (GTX 1070), headless Chrome at 1280×720 | Chrome | WebGPU | 60 fps (vsync-limited), no errors. Walking, turning and jumping checked with simulated keys; gamepad not tested (no gamepad in headless mode) |
| 2026-10-08 | Same, with Part 1's Dr. Green | Chrome | WebGPU | 60 fps, no errors. Standing, walking (Shift), running and jumping checked in screenshots; facing correct. Camera defaults changed to 4.5 m / aim height 1.0 m for the smaller character |
| 2026-10-08 | Same, with the reference look and mist | Chrome | WebGPU | 60 fps once shaders had compiled, no errors. A screenshot 4 s after loading read 7 fps while the new noise shaders compiled: first-use stutter, as predicted in the performance plan |
| 2026-10-08 | Same, with the interior | Chrome | WebGPU | 60 fps once shaders compiled (the first second after loading read 11 fps: 159 cuttable meshes compiling), no errors. All four areas visible through the hull; collision with furniture checked (walking into the crew quarters' furniture stops her) |
| 2026-10-09 | Same, frame time from clear spots | Chrome | WebGPU | 1920×1080 uncapped: crew quarters 9.7 ms median (95th 11.9), engineering 6.1 (7.5), cargo bay 11.1 (12.9). Earlier crew quarters numbers were inflated: the test teleport put her inside the couch (physics controller ~20 ms per step there; one engineering spot ~200 ms, read as 1 fps); at clear floor spots a physics step averages 0.1 ms |
| 2026-10-09 | Same, audit at 1920×1080 uncapped; merged shadow caster; crew resized | Chrome | WebGPU | CPU-bound on draw calls (half resolution: no change). See-through materials ~5 ms/frame of per-draw overhead; props ~3 ms; shadow pass draws ~0.7 ms. Merged shadow caster: crew quarters 835 → 556 draws, 14.9 → 9.9 ms (92–100 fps uncapped); identical shadow. Opaque glass: no difference. Owner: Chrome a solid 60 fps, Firefox under 30 at 1080p. Crew scaled to the crew file's proportions (Kaufman ×0.65, Ogawa ×0.78, Adams ×0.79) |
| 2026-10-09 | Same, props, room lights, crew | Chrome | WebGPU | **60 fps** steady, no errors. Draw calls 743–941 per view (with the shadow pass; props cast no shadows), ship 547 primitives, 54 materials, 2.58 MB. Shader build at load ~8 s (was ~2.5 s). Dr. Kaufman animating on the couch; Adams and Dr. Ogawa in the cockpit. *All* lights: a stall of a few seconds while every shader rebuilds, then 60 fps. See-through rays 0.11 ms (140 objects) |
| 2026-10-09 | Same, cargo ramp cut while closed; bulkheads always visible | Chrome | WebGPU | 60 fps, no errors. Ramp closed, camera behind the ship: the hole opens through it and she's visible in the cargo bay (with the cut off, only the ramp's window shows); ramp open: whole, on the ground. Bulkheads always visible: from outside the cargo bay, the cargo bulkhead stays as a column seen edge-on; from the crew quarters, the cockpit doorway is unchanged |
| 2026-10-09 | Same, always-visible objects, objects on bulkheads, pause | Chrome | WebGPU | 60 fps, no errors; rays 0.16 ms/frame. Sled, ceiling machine and chair backs stay solid with her behind them (behind a chair back, only her hair shows). Attached to bulkheads (found at load): `Galley`, `Head`, both ladders, part of `Locker`. Then all cockpit furniture made always visible: nothing in the cockpit is cut; with the camera in front, the seat stays and she shows beside it. Pause: shown when the mouse is released, nothing moves while paused, a click resumes |
| 2026-10-08 | Same, dividers solid while the camera is inside | Chrome | WebGPU | 60 fps, no errors; rays 0.17 ms/frame. Crew quarters looking into the cockpit: the doorway stays clean (no cut slabs); the inner wall between camera and her is cut. First version (always solid from inside) turned the screen black when the camera trailed behind an inner wall: fixed by "unless it hides her". Cargo bay from the side (camera outside): unchanged |
| 2026-10-08 | Same, see-through rules second pass | Chrome | WebGPU | 60 fps, no errors; rays 0.2 ms/frame with BVHs (15 ms without). 3D printer in front of her: stays. Crew-quarters table between camera and her: stays. Locker/head beside her: cut from the angles where they cover her. Through the windshield from outside: no hole, hull whole, she's seen through the glass. Cockpit bulkhead: cut as a whole (toggle) removes the odd slab in the doorway; own-colour cut surface makes little difference there (the dark parts are the bulkhead's black material). Not staged exactly: the owner's chair-back and bench-near-camera views |
| 2026-10-08 | Same, see-through rules (structure / furniture) | Chrome | WebGPU | 60 fps, no errors; occlusion rays 0.09 ms/frame. Cargo bay: the bench in front of her stays whole (doesn't hide her). Cockpit, camera behind her: front panels whole. Crew quarters: galley and lockers cut only from angles where they hide her; table near her whole; bunk end near the camera cut (near-camera rule, added after the first test showed near-camera furniture filling the view). Debug tint confirms per-object values with shared materials. A wall cabinet at the near-camera boundary comes out half-dithered: tunable |
| 2026-10-08 | Same, see-through hull on everything inside | Chrome | WebGPU | 60 fps, no errors. Cargo bay: the bench in front of her is cut (before: whole, in the way); floor solid. Upper deck: couch, table and cockpit seats cut with no stubs; floor under her solid in the crew quarters and the cockpit (whose floor is part of `Dashboard Body`). Ship shaders compiled during loading (2.2–2.6 s): the 0.57 s freeze after the ship appeared is gone; total load stall unchanged (~3 s) |
| 2026-10-08 | Same, see-through hull + camera collision | Chrome | WebGPU | 60 fps, no errors. In the cargo bay: hole through the hull from the side and through the ceiling from above, floor solid; off: hull opaque. Ship's shadow identical with the cut on and off. Outside with the ship in the way: camera came in from 8 m to 2.96 m |
| 2026-10-08 | Same, Zamboni Dr. Green with retargeted animations | Chrome | WebGPU | No errors. Standing (back and front), walking, running checked in screenshots: legs stride correctly, arms not twisted, facing correct |

**Build size:** 5.35 MB minified, **1.95 MB gzipped** with Rapier (was 278 KB before). The `-compat` Rapier package embeds its WebAssembly as base64 inside the JavaScript (~1.4 MB of wasm becomes ~1.9 MB of text). It fits the 3 MB boot budget but takes most of it; the non-compat package (`@dimforge/rapier3d`) loads the `.wasm` as a separate, smaller file that the browser can compile while it downloads, and is worth switching to before the game ships.

## Tuned values

*To be filled in after the owner's play-test.*
