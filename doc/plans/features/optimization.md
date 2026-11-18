# Optimisation: smaller files, fewer draw calls (SC-180)

> **[Agent note]** Written 2026-11-18 (owner: "create an optimization plan; let's do 1 and then the palette texture; add the rest as provisional"). **Step 1 built 2026-11-18; step 2 built and measured the same day ([as built](palette-material.md#as-built-pass-2-2026-11-18)), its changes from the plan OK'd by the owner. Steps 1 and 2 done.** Steps 1 and 2 are the agreed order; steps 3–6 are provisional, each with its own go-ahead later. Figures measured from the exported files on 2026-11-18 unless marked *(estimate)*.

## Where things stand

| File | Size | Of which images | Materials | Primitives drawn |
|---|---|---|---|---|
| Ship (`zamboni-ship.glb`) | 3.9 MB | **2.4 MB** (28 PNG, mostly 512²) | 60 | 660 |
| Crew | 0.27 MB | 0.01 MB | 20 | 34 |
| Parka (player) | 0.65 MB | 0.05 MB | — | — |

Budgets ([budgets.md](../architecture/game-architecture/budgets.md)): ≤ 300 draw calls, ≤ 30 materials. 60 fps on the GTX 1070 already; the MacBook is where the gains would show. First-load shader compile ≈ 12 s, the largest load cost.

## Step 1: the ship's textures as WebP (agreed, first)

- **What:** a `webp` step in `tools/export.mjs` for the ship, after `resize` (`resize, dedup, uvs, webp, meshopt`): gltf-transform's `webp` command, already installed with `sharp`. The game's loader reads WebP (`EXT_texture_webp`); Chrome supports it.
- **Quality:** lossy at about 90 for photos and screens; **lossless for `Color Palette`** and any image where exact colours matter (and for the step 2 palette).
- **Also** the player and crew exports if it helps them (the crew's images are tiny; the parka's weight is its geometry, see step 6).
- **Gain:** the ship ≈ 3.9 → 2–2.4 MB *(estimate)*. Nothing changes in the game's code. Export time: a few seconds.
- **Done when:** the after-export check passes; every room's screenshot (`npm run see-through`) and close-ups of the screens, dials and keyboards match today's; the file's size recorded. A small step: no separate plan.

## Step 2: one palette material for the ship's colours (agreed, second)

Its own plan: **[palette-material.md](palette-material.md)** (open questions there: at export or in the `.blend`, option A or B). ≈ 660 → 316–364 primitives, ≈ 60 → 31–38 materials.

- **Done 2026-11-18:** 60 → 32 materials, 613 → 284 primitives in the meshes, 1.90 MB; **draw calls about halved in every view** (outside 895 → 458, rooms 161–415); pipelines 100 → 98, the compile about the same (cold ≈ 14.4 s, a reload 2.1 s). The 660 above counted primitives per copy of a shared mesh; 613 counts them once.

- **One addition from step 1:** the palette image must not be blurred: lossless, and either nearest filtering without mipmaps or squares large enough (e.g. 16 px) that mip levels don't mix neighbouring colours.

## Provisional (later, each asked for first)

3. **Static objects merged per room** (after step 2). Today 161–415 draw calls per room view, 458 from outside → about 100–150 *(estimate)*. Doors, see-through units, pickables and lights stay separate; the merge has to follow the see-through hull's groups. The most work here; its own plan.
4. **The crew's colours in the palette** (`export:crew`). 34 → ≈ 10–15 draw calls; folds the duplicates (`Black.002`…). Small once step 2 exists.
5. **KTX2 textures** (instead of WebP, if GPU memory matters on the MacBook): textures stay compressed on the GPU, ≈ 25 → 5 MB *(estimate)*, faster upload. Costs a decoder in the game (a few hundred KB) and closer checks of small text.
6. **In the `.blend` (owner's, low priority):** `Contraption` (renamed `Scanner Array` by the owner; the saved 1.22 still says `Contraption`) is 21,530 triangles, 23% of the ship: 11,365 faces, almost all quads, 0.84 × 1.39 × 1.24 m, most of it `Metal` (11,300 triangles) and `Black` (8,700). The owner sees no excess geometry; dense for its size but not a problem at today's triangle count. Left as is unless triangles become a cost; the parka is 5× the jumpsuit's size from geometry, worth a look before the parkas ship; the 9 mirrored objects (`Bench`, `Monitor001`, `Turbine_Right`…) could have their scale applied (the game copies their geometry at load to fix them; the two door hinges need care).

**Not in this plan:** lightmaps (a look decision, see [performance.md](../architecture/game-architecture/performance.md)); the rest of the first-load compile (fewer kinds of material, its own pass if the load bothers you).

## Estimates

- Step 1: a short session. Step 2: see its plan (about one session, plus a short one). Owner: a look at the screenshot comparisons after each.

## Open questions

Answered 2026-11-18: the export from 1.22 is safe; step 2's answers in its plan.

**Fixed (2026-11-18):** the baseline export found the file's images pointing at `Desktop\The Zamboni.archive\…` (gone); the owner moved the textures to `resources/textures/`; the agent relinked the 13 images the ship uses there and removed the unconnected image node (`Dr. Kaufman Difuse`, a bake leftover) from `Teal Darkest`, then saved (backup: `The Zamboni 1.22 (backup 2026-11-18 before relink).blend`). Still unlinked, unused: `Snow006_1K_Displacement.jpg`.

## As built (step 1, 2026-11-18)

- `tools/webp.mjs`, the `webp` step in `export.mjs` (ship only: `resize, dedup, uvs, webp, meshopt`), a `WEBP:` line in the summary. The ship: **3.90 → 2.07 MB** (images 2.42 → 0.59 MB, 28 textures, `Color Palette` lossless). Export time unchanged (24 s).
- **Checked:** the gate saw only the textures' bytes differ (same objects, triangles, bounds, tags); the after-export check passes; every room's screenshot (`npm run see-through`) against the old file: differences only the see-through's random dither and single edge pixels (run-to-run noise), the keyboards and screens unchanged; `npm run check`, `npm run build`; the smoke: 83 pass, the 4 known failures (SC-168).
- **Not done:** the crew and player exports (their images are tiny; not worth a step).

## After

`asset-pipeline.md` and `tools/README.md` (the new steps), `budgets.md` (new measurements), a decision-log entry for the palette.
