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
| Invert vertical look (on by default in prototypes) | (tuning panel) | Y |
| Tuning panel | View/Back | ` (backtick) |

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

**The Zamboni's exterior and cargo bay**, landed about 12 m ahead with its back to the start and the **cargo ramp open**: `app/assets/test/zamboni-exterior.glb` (561 KB), exported from `resources/models/The Zamboni 1.18.blend` with [`app/tools/export-ship-exterior.py`](../../tools/export-ship-exterior.py):

```sh
blender -b "resources/models/The Zamboni 1.18.blend" --python app/tools/export-ship-exterior.py --   --out app/assets/test/zamboni-exterior.glb
```

- **Objects:** `Hull_Merged`, `Windshield`, the four turbines, the three landing gears, `Door`, `Door Cargo` (the ramp), `Top Hatch`, the two lab windows, and the cargo bay: `Floor Bottom` (its floor), `Bulkhead Cargo` (its front wall, with a doorway), `Floor Top.001` (its ceiling). Modifiers applied. It stands on its landing gear at y = 0, as modelled.
- **Scale:** the same factor as the Zamboni Dr. Green (crew and ship share units in the Blender files), so their proportions are as modelled.
- **Collider:** `zamboni_col`, all of the above except the ramp joined into one mesh at full detail (4,662 triangles), never rendered (*show colliders* draws it as a wireframe). A decimated version (the first try) partly closed the cargo opening.
- **Cargo ramp** (`Door Cargo`, a separate object hinged at its bottom edge): opens outward until its far end touches the ground (92° from closed; it's slanted when closed, so it ends ~25° below horizontal). *Cargo ramp open* in the tuning panel animates it open/closed (1.5 s).
  - While moving or closed it has a **convex** collider that follows it (a copy of its mesh keeps the window cut through it, and the character fell into that).
  - Fully open, a **walkable slope** replaces it: one smooth surface from where the ramp meets the ground up to the rear edge of the cargo floor. The modelled ramp has a lip on the ground and its hinge sits ~0.29 m below the cargo floor, which stopped the character controller. Near the top, the feet can float up to ~0.29 m above the visible ramp; fixing the model (hinge level with the floor) would remove the need for this.
- **Double-sided materials** (export report, to fix in Blender): `Dark Teal`, `Darkest Teal`, `Floor Tiles`, `Glass`, `Grate`, `Gray`, `Metal`, `Teal Dark`, `Thruster`, `White Emission`.
- **Not handled yet:** the camera has no collision, so it follows the character inside the hull (the see-through hull is the planned answer); the interior beyond the cargo bay is unfurnished (only floors and the cargo bay wall are exported).

**Physics:** [Rapier](https://rapier.rs/) 0.21.0 ([`src/physics.ts`](src/physics.ts)). The character is a capsule (radius 0.28 m, 1.23 m tall) moved by Rapier's kinematic character controller: it slides along walls and steps over ledges up to 0.3 m. Gravity and jumping stay in `character.ts`. Animation follows the speed the character *actually* moved, so running into the hull settles into standing.

> **Rapier note (2026-10-08):** with Rapier 0.19–0.21, the character controller sinks through a very large box collider (a 1000 m ground box); a smaller box or a triangle mesh works. The ground is therefore a flat two-triangle mesh. Also, `@types/three` pulls in an old Rapier (0.12.0) for its type definitions, so two copies are installed; the prototype uses the pinned 0.21.0.

## See-through hull and camera collision

Inside the ship (Dr. Green in the cargo bay), a round, dither-edged hole is cut through the hull, walls and ceiling between the camera and her chest; outside, the camera collides with the ship instead. Details: [`doc/features/see-through-hull.md`](../../../doc/features/see-through-hull.md). Code: [`src/cutaway.ts`](src/cutaway.ts) (TSL), wired up in `src/ship.ts` (which surfaces, the cargo bay volume) and `src/main.ts`; camera collision in `src/camera.ts` + `Physics.castRay`. Tuning panel → *See-through hull*.

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
| `src/cutaway.ts` | See-through hull: the TSL cut, cuttable material copies |
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
| 2026-10-08 | Same, see-through hull + camera collision | Chrome | WebGPU | 60 fps, no errors. In the cargo bay: hole through the hull from the side and through the ceiling from above, floor solid; off: hull opaque. Ship's shadow identical with the cut on and off. Outside with the ship in the way: camera came in from 8 m to 2.96 m |
| 2026-10-08 | Same, Zamboni Dr. Green with retargeted animations | Chrome | WebGPU | No errors. Standing (back and front), walking, running checked in screenshots: legs stride correctly, arms not twisted, facing correct |

**Build size:** 5.35 MB minified, **1.95 MB gzipped** with Rapier (was 278 KB before). The `-compat` Rapier package embeds its WebAssembly as base64 inside the JavaScript (~1.4 MB of wasm becomes ~1.9 MB of text). It fits the 3 MB boot budget but takes most of it; the non-compat package (`@dimforge/rapier3d`) loads the `.wasm` as a separate, smaller file that the browser can compile while it downloads, and is worth switching to before the game ships.

## Tuned values

*To be filled in after the owner's play-test.*
