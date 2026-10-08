# Plan: Prototype 02 — Low-resolution rendering

**Status:** *draft*, 2026-10-08, for owner review. Part of [Step 2](../../steps/02-first-prototype.md). Depends on [Repo and prototype workspace](../architecture/repo-and-prototypes.md); independent of prototype 01, so the two can be built in parallel.

## Goal

See how the game looks when the 3D view is rendered at a **low fixed resolution and scaled up**, the *A Short Hike* approach, and measure what it does for performance on the owner's two machines. Background: [game architecture plan: performance](../architecture/game-architecture/performance.md#device-limitations).

## Scope

**In:**
- The real ship, exported straight from `resources/models/The Zamboni 1.18.blend`, so the look is judged on actual art, not a test scene
- A capsule character for scale, standing where the player would be
- A camera that can be moved freely, plus preset viewpoints
- Live controls for the resolution and the upscaling
- A sample dialogue box in HTML on top, to see crisp UI over the low-resolution 3D
- Frame-rate measurement and screenshots for comparison

**Out:** baked lighting (simple real-time lights only, so the ship will look flatter than in the final game), the optimised export pipeline (palette material, Meshopt, KTX2: that's the measurement prototype), walking, collisions, audio.

## Constraints from the docs

- Three.js r186, `WebGPURenderer` (WebGL2 fallback), Svelte 5 for the UI overlay ([`architecture/stack.md`](../../architecture/stack.md)).
- Gamepad first, keyboard and mouse secondary ([`architecture/scope.md`](../../architecture/scope.md)).
- Retro-tech look: green CRTs, teal and grey panels ([`design/README.md`](../../design/README.md)).

## How the upscaling works

The 3D canvas is rendered at a small size and the browser stretches it to fill the window. CSS decides how it's stretched:
- `image-rendering: pixelated`: hard, square pixels.
- `image-rendering: auto`: smooth, soft blur.

No extra rendering pass is needed, so the cost is just the smaller render.

**Integer scaling.** For even, square pixels, the render size is the window size divided by a whole number, the **pixel size**. On a 1920×1080 screen: pixel size 2 → 960×540, 3 → 640×360, 4 → 480×270. Non-integer sizes give uneven pixels; the prototype shows both so the difference can be judged.

## Controls (tuning panel)

| Setting | Values |
|---|---|
| Pixel size | 1 (native) to 6, or a fixed vertical resolution (720, 540, 360, 270) |
| Upscale | Pixelated / smooth |
| Pixel-ratio cap at native (for comparison) | 1, 1.5, 2, device |
| Viewpoint | Exterior three-quarter view, cockpit, crew quarters, engineering, cargo bay |
| Sample UI on/off | The HTML dialogue box over the 3D |
| Light setup | Simple presets (cool daylight, warm interior) so the look isn't judged on one lighting setup |

**Camera:** gamepad (left stick move, right stick look, shoulders up/down) or mouse + WASD; number keys or D-pad for viewpoints.

## The work

1. **Ship export:** a small Blender script, run from the command line, that exports the ship's collections to a `.glb` with the textures it uses, leaving out the `Temple`, `Archive` and `Hidden` collections (owner, 2026-10-08). The script is kept in the repo (`app/tools/`) so it can be re-run.
2. **Scaffold** `app/prototypes/02-low-res/` (Vite + TypeScript + Svelte), port 5202.
3. **Scene:** load the ship, place the capsule, add the light presets, the free camera and the viewpoints.
4. **Resolution control:** the canvas render size from the pixel size or fixed resolution; CSS upscale mode; window resizing keeps integer scaling.
5. **Sample UI:** one Svelte dialogue box (speaker name, a line of text, two options), styled just enough to read.
6. **Measurement:** a small panel with frame time (average and worst over the last few seconds), render size, backend (WebGPU or WebGL2), GPU name if the browser reports it. A "screenshot" button saves the current view with its settings in the file name.

## Testing on the owner's machines

| Machine | GPU | Role |
|---|---|---|
| This PC | NVIDIA GTX 1070, 1920×1080 screen | Dedicated GPU: the comfortable end |
| MacBook Pro 13" 2020 (Intel) | Intel Iris Plus G7 integrated graphics (the four-port model, since it runs macOS 26 Tahoe), 2560×1600 screen | The low end: an integrated GPU a generation older than Iris Xe, on a high-DPI screen. Problems will show here first |

For each machine: frame times at native resolution vs pixel sizes 2, 3 and 4, from the same viewpoints, in Chrome and Safari on the Mac (both have WebGPU on Tahoe; Safari's WebGL2 fallback can be tested by turning WebGPU off in its developer settings). Results go in the prototype's README.

## Things to judge

- **Does it suit the art?** Thin details (keyboards, dials, text on screens) may disappear at low resolution.
- **Pixel crawl:** edges shimmer as the camera moves at low resolution. Acceptable, or does it need a fix (e.g. a slightly higher resolution, or smooth upscaling)?
- **Crisp UI over pixelated 3D:** does the mix look intended, or should the UI be pixel-styled too (a design-system question)?
- **Which pixel size** is the sweet spot between look and performance?

## Done when

- **Agent checks:** `npm run check` passes; the prototype loads with no console errors; screenshots at pixel sizes 1–4 from each viewpoint.
- **Owner checks:** the look is judged on both machines, and frame times are recorded.
- **Outcome:** a decision: low-resolution rendering as the game's style, as a performance option only, or not at all. Recorded in the decision log.

## Open questions

- None left; waiting for plan approval.

## After

- `app/prototypes/02-low-res/README.md`: settings, screenshots, frame times.
- Decision-log entry on the rendering style; update the [performance plan](../architecture/game-architecture/performance.md) and [`architecture/platform.md`](../../architecture/platform.md) with the measured numbers.
