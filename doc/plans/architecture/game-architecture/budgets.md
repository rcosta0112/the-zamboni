# Budgets

Part of the [game architecture plan](README.md). All numbers are *proposed* until the measurement prototype confirms them.

## Measured so far

- **The ship:** `The Zamboni 1.18.blend` (2026-10-08): 375 mesh objects, about **107k triangles** (85k unique), 79 materials, 15 images, almost all tiny.
- **The ship in prototype 01, with its props** (2026-10-09): 2.58 MB compressed (+ 171 KB collider), 98k triangles, **547 primitives** (small props merged per room; ≈ 780 without), 54 materials after deduplication. Rendered: 743–941 draw calls per view including the sun's shadow pass; 60 fps on the owner's PC (GTX 1070). Shader build at load ~8 s. Over the draw-call and material budgets until the palette material exists.
- **The characters:** `The Crew 1.09 Dr. Green.blend` (2026-10-08): 400–722 triangles per character, mostly flat colours, one 1024² or 2048² texture each. About 0.1–0.5 MB per outfit after compression *(estimate)*.

## Download (compressed sizes)

| Bundle | Budget | Of which collision | Biggest lever |
|---|---|---|---|
| Boot (code, Rapier, fonts, title) | ≤ 3 MB | — | Library size; fonts subset to the characters used |
| Ship (geometry + lighting + collision) | ≤ 12 MB | ≤ 0.3 MB | **Lighting:** lightmap resolution and format ([performance](performance.md#lighting)) |
| Crew (3 humans in jumpsuits, Adam, the penguin; player, shared and personal animations) | ≤ 4 MB | — (capsules) | Texture size: 1024² per outfit ([characters](characters.md)) |
| Parkas (3 outdoor outfits) | ≈ 1 MB | — | Loaded with the first landing site |
| Scene animations (each scene's ambient loops and custom actions) | ≈ 0.2–0.5 MB per scene | — | Number and length of custom animations; fingers ([characters](characters.md#budget)) |
| Travel terrain kit (ice/snow and rock) | ≤ 3 MB | — (generated) | The terrain is generated; the cost is its surface textures ([levels](levels.md#the-planet-surface)) |
| Each landing site (terrain, ruins, set dressing, collision) | ≤ 10 MB | ≤ 0.5 MB | **Unique ruins:** a shared ruin kit costs much less |
| Sound effects + ambience | ≤ 8 MB in total | — | Mono for positional sounds; shorter loops |
| Music | ~1 MB per minute (AAC 128 kbps) | — | Number of minutes |
| **Whole game, excluding music** | **≈ 60–90 MB** | | Mostly the number of unique landing sites |

## Collision

Collision shapes are **included** in the bundles above. They're small because they're never drawn:

| Where | Shape | Cost |
|---|---|---|
| Ship rooms, walls, furniture | Simplified `*_col` meshes made in Blender, or boxes/capsules where they fit | Usually 5–10% of the visual triangles; ≈ 0.1–0.3 MB for the whole ship |
| Landing-site terrain | Heightfield (a grid of heights) | Tiny; cheaper than a mesh for the physics engine too |
| Ruins | Simplified meshes or boxes | Part of the site's ≤ 0.5 MB |
| Pickable props | Boxes, spheres, capsules, or convex hulls | Almost nothing |
| Characters | A capsule each | Nothing to download |

At runtime, collision meshes cost a little memory in the physics engine and no GPU time.

## Runtime (per frame, on the test machines)

| Budget | Target | Why |
|---|---|---|
| Draw calls | ≤ 300 | The main CPU cost in the browser |
| Triangles on screen | ≤ 1 M | The whole ship is ~107k today |
| Unique materials (shader variants) | ≤ 30 | Each new one compiles a shader, a cause of stutter ([performance](performance.md#stutter)) |
| Texture memory on the GPU | ≤ 512 MB | Integrated GPUs share system RAM; browsers kill tabs that use too much |
| Real-time lights | 1 shadowed sun/key light + ≤ 4 small unshadowed lights near the player | Baked lighting does the rest |
| Physics bodies | Static collision as above; ≤ 200 dynamic props awake at once | Sleeping bodies cost almost nothing |

## Conventions that make the budgets reachable

- **One palette material.** The ship's 79 materials are mostly flat colours. The export turns them into one shared material with a colour palette (or vertex colours), plus a few special materials: emissive screens, glass, the see-through hull. Artists keep normal Blender materials; the conversion happens at export.
- **Geometry:** Meshopt compression + quantisation (decodes faster than Draco).
- **Textures:** KTX2: UASTC for lightmaps and anything with gradients, ETC1S for the rest. They stay compressed in GPU memory.
- **Audio:** AAC (`.m4a`), see [`architecture/audio.md`](../../../architecture/audio.md).

## Checking

A **budget script** (`npm run budget`) reads every exported `.glb` and audio file and reports size, triangles, draw calls, materials, texture memory and collision size against these budgets. The agent runs it after every export.
