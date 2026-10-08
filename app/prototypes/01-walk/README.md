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
  --out app/assets/test/green-parka.glb
```

The script exports in the rest pose at the origin, applies modifiers (the mesh is mirrored), and leaves out bones that are flagged as deforming but carry no weights: `Elbow_r` (the IK pointer), `Foot_l` and `Foot_r`.

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
| 2026-10-08 | Same, Zamboni Dr. Green with retargeted animations | Chrome | WebGPU | No errors. Standing (back and front), walking, running checked in screenshots: legs stride correctly, arms not twisted, facing correct |

**Build size:** 1,012 KB minified, 278 KB gzipped (three's WebGPU build + GLTFLoader + this prototype), plus the 272 KB model.

## Tuned values

*To be filled in after the owner's play-test.*
