# Lighting and the rendered look

**Status:** decided for the web build (owner, 2026-10-24): **no light baking.** The rest of this page is notes on what the look would need, kept for a later decision: a packaged (native) build, or the lighting work set aside as SC-56. Decision: [decision log](../decision-log.md), *No light baking in the web build*.

> **[Agent note]** Written 2026-10-24 from a conversation with the owner about the owner's reference render (two crew members at the crew quarters' table, chess, a mug, a glowing tablet, a sunbeam from the right). Frame times are the agent's estimates for a mid-range desktop GPU at 1080p, **not measured** in the game unless said.

## The web build: real-time only

Baked lighting costs a web game where it hurts most: download (the lightmaps), the export (a second UV set on every baked mesh, where the export now strips UVs to keep GPU pipelines and load time down: [`pipelines.ts`](../../app/prototypes/0.0.2/src/pipelines.ts)) and the pipeline (a bake after every change to the ship). It is also static: doors that move and a sun that changes with the ship's heading don't fit it. The ship stays lit by real-time lights (the sun with its shadow map, the room lights, the sky), as it is now.

**In a packaged build** (Electron, Tauri or similar running the same three.js code), download size matters much less and the notes below become worth weighing again; the renderer and its limits are the same.

## What the reference render's look is made of

The render is path-traced (Cycles): every bounce of light is computed. The look is mostly light, not materials.

| What you see | How a real-time game would get it | GPU cost per frame (estimate) |
|---|---|---|
| **Bounce light**: the warm fill on the seat, the dim room, dark corners | Baked lightmaps for the ship (the fakes, below, cost far more and look worse) | ~0 ms; the cost is the bake, the download and texture memory |
| The same bounce light on **characters**, who move | `LightProbeGrid` (three r186, `examples/jsm/lighting/`, works with `WebGPURenderer`): a grid of points that record the room's light and pass it to anything moving through | ~0 ms if computed at load or ahead of time |
| **The sunbeam's shadows**, soft-edged and crisp near the object | Real-time sun shadow, filtered (soft shadow map). The game has shadows already | 1–3 ms, by shadow-map size and casters |
| **Dark contacts** under the mug, chess pieces, laptop | Baked for the ship; for moving things **GTAO** at half resolution and **contact shadows** (three's `SSSNode`: *screen-space shadows*, not subsurface) | GTAO 1–2 ms; contact shadows ~0.5–1 ms |
| **The tablet's glow** | Bloom (below) | 1–2 ms at half resolution |
| **Colour response**, soft highlight roll-off | AgX tone mapping (a choice on the panel already); three's AgX won't match Blender's exactly: tune side by side | ~0 ms |
| **Soft, lit faces** | Mostly the light above; cheap subsurface optional (below) | — |

**Total for the high tier:** roughly **3–7 ms** more than today, within 60 fps on a desktop GPU. The low tier drops the post-processing and AO.

**Without baking**, the bounce light is the hard part. The options are a probe grid for everything (coarse: light doesn't stop at walls between probes, so it needs a grid per room), hand-placed fill lights, or **SSGI** (three's `SSGINode`: light bounced from what's on screen): about 3–8+ ms, needs temporal denoising, smears when the camera moves. Not recommended.

## Lightmaps: how big (for a packaged build)

Measured on the game's ship file (`zamboni-ship.glb`, 2026-10-24): 170 meshes, 97k triangles, **~780 m² of surface**, 10.7 × 6.5 × 9.7 m. About 330 m² is the hull and turbines, seen from outside and lit in real time anyway: **~400 m² of interior** to bake. Some of it is never seen (backs of panels), so the real need is likely a bit lower.

What resolution depends on what goes in: **bounce light and corner darkening only, the sun kept real time** (recommended: its shadows stay sharp on moving characters too, and the sun can move), or the sun's shadows baked too (the chess pieces' shadow edges need ~1 cm per texel, and the sun is fixed).

| Interior, ~400 m², packing wastes ~35% | Texels per metre | Lightmap |
|---|---|---|
| Bounce and corners, coarse | 32 (3 cm) | one 1024² |
| **Bounce and corners, comfortable** | 64 (1.5 cm) | **one 2048²** |
| Sun shadows baked too | 100 (1 cm) | two 2048² |
| The whole ship, hull included | 64 | one 2048² + one 1024² |

Small props (mugs, chess pieces) are better lit by the probe grid than given lightmap space.

- **Download:** baked light is HDR; compressed (KTX2 HDR, or an 8-bit encoding such as RGBM) about **1–4 MB per 2048²**: about the ship file's size (3.9 MB).
- **GPU memory:** 4–16 MB per 2048², by format. Half-size maps on the low tier.
- **Frame time:** one texture read per pixel, effectively free.
- **Work:** a second, non-overlapping UV set per baked mesh (Blender's *Lightmap Pack*) kept by the export; a Cycles bake of minutes; light that's wrong in one of a moving door's states.

## Bloom

Planned since [`stack.md`](stack.md) (three's TSL bloom node) and budgeted in [performance](../plans/architecture/game-architecture/performance.md) (half or quarter resolution, off on the low tier). Not built.

- **Cost:** the scene is drawn to an offscreen HDR image, then blurred at a few smaller sizes and added back: **~1–2 ms** at half resolution. Tone mapping moves from `renderer.toneMapping` into the post-processing (the panel's tone mapping and exposure rewired). The bloom's shaders join the warm-up.
- **Plain bloom** blooms everything above a brightness: also the bright sky (strength 2) and the ice in the exterior shots, not just emissives. **Selective bloom** (the emissive light written out as a second image, only that bloomed) blooms the screens and glows only: a bit more GPU and work. Recommended.
- **What was tuned without it** needs another look: the jetpack's painted halo (turn it down: [interaction](../features/interaction.md)), the thruster flames, every display, the see-through screenshots.

## Anti-aliasing

On by default: MSAA (4× under WebGPU), `antialias` on the renderer ([`main.ts`](../../app/prototypes/0.0.2/src/main.ts)); the panel's *anti-aliasing (reloads)* turns it off, kept in local storage.

- **What turning it off gains: not measured.** Typically under 1 ms to about 2 ms at 1080p on a desktop GPU, more where many layers overlap (glows, the see-through) or on integrated graphics; nothing if the frame waits on the CPU.
- **The fps readout can't show it** ([`stats.ts`](../../app/prototypes/0.0.2/src/stats.ts)): it measures time between frames, capped by the screen's refresh. Measuring needs the GPU's own frame time (the renderer's timestamp tracking under WebGPU) on the readout.
- **With post-processing** (bloom), the canvas's MSAA no longer applies: the offscreen image needs its own samples (memory), or a cheaper filter (FXAA, SMAA: a bit blurrier).

## Subsurface scattering

- **Cheap SSS exists:** `MeshSSSNodeMaterial` (three r186, experimental, extends the physical material): light through thin parts, set by a thickness. One extra lighting term per light per pixel: close to free. On the low-poly faces it reads as a soft warm edge glow, about what the reference render shows.
- **True SSS doesn't:** nothing like Blender's random walk or the screen-space skin blur of big engines. A custom one costs a full-screen blur (~1–2 ms) and a lot of work: not worth it for this style.

## Open questions

- How the interior gets its bounce light without baking: a probe grid per room, fill lights, or none (the look as it is).
- Whether a packaged build is ever made; if so, these notes are its starting point.
- **Whether post-processing is worth it** (bloom, AO, contact shadows): a pass later (owner, 2026-10-24; SC-136). First step: the GPU's own frame time on the readout, to measure each effect and MSAA.
